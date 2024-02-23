import * as extract from '@dxta/extract-schema';
import * as transform from '@dxta/transform-schema';
import { sql, eq, or, and, type ExtractTablesWithRelations } from "drizzle-orm";
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import { isCodeGen } from './is-codegen';
import { parseHunks } from './parse-hunks';
import { type SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import { type ResultSet } from '@libsql/client/.';
import { isMemberKnownBot } from './known-bots';
import { getDateInfo } from '../../../schemas/transform/src/seed/dimensions';
import { compare } from './compare';

type BrandedDatabase<T> = LibSQLDatabase<Record<string, never>> & { __brand: T }
type DatabaseTransaction = SQLiteTransaction<"async", ResultSet, Record<string, unknown>, ExtractTablesWithRelations<Record<string, unknown>>>;

export type TransformDatabase = BrandedDatabase<'transform'>;
export type ExtractDatabase = BrandedDatabase<'extract'>;
type TableMeta = {
  _createdAt: Date | null;
  _updatedAt: Date | null;
}

function getUsersDatesMergeRequestMetricsId(db: TransformDatabase, transformMergeRequestId: number) {
  return db.select({
    usersJunkId: transform.mergeRequestMetrics.usersJunk,
    datesJunkId: transform.mergeRequestMetrics.datesJunk,
    mergeRequestMetricId: transform.mergeRequestMetrics.id,
  })
    .from(transform.mergeRequestMetrics)
    .where(
      eq(transform.mergeRequestMetrics.mergeRequest, transformMergeRequestId),
    );
}

function insertMergeMetrics(tx: SQLiteTransaction<"async", ResultSet, Record<string, unknown>, ExtractTablesWithRelations<Record<string, unknown>>>, mergeMetrics: transform.NewMergeRequestMetric) {
  return tx.insert(transform.mergeRequestMetrics)
    .values(mergeMetrics);
}

function insertMergeRequestEvent(tx: SQLiteTransaction<"async", ResultSet, Record<string, unknown>, ExtractTablesWithRelations<Record<string, unknown>>>, mergeRequestEvent: transform.NewMergeRequestEvent) {
  return tx.insert(transform.mergeRequestEvents)
    .values(mergeRequestEvent);
}

function deleteMergeRequestEvents(tx: SQLiteTransaction<"async", ResultSet, Record<string, unknown>, ExtractTablesWithRelations<Record<string, unknown>>>, mergeRequestId: transform.MergeRequest["id"]) {
  return tx.delete(transform.mergeRequestEvents)
    .where(
      eq(transform.mergeRequestEvents.mergeRequest, mergeRequestId)
    );
}

function updateMergeMetrics(tx: SQLiteTransaction<"async", ResultSet, Record<string, unknown>, ExtractTablesWithRelations<Record<string, unknown>>>, mergeMetrics: Omit<transform.MergeRequestMetric, keyof TableMeta>) {
  return tx.update(transform.mergeRequestMetrics)
    .set({
      ...mergeMetrics,
      _updatedAt: sql`(strftime('%s', 'now'))`,
    })
    .where(
      eq(transform.mergeRequestMetrics.id, mergeMetrics.id)
    );
}

function upsertRepository(db: TransformDatabase, repo: transform.NewRepository) {
  return db.insert(transform.repositories)
    .values(repo)
    .onConflictDoUpdate({
      target: [
        transform.repositories.externalId,
        transform.repositories.forgeType
      ],
      set: {
        name: repo.name,
        namespaceName: repo.namespaceName,
        _updatedAt: sql`(strftime('%s', 'now'))`,
      },
    })
    .returning();
}

function upsertMergeRequest(db: TransformDatabase, mergeRequest: transform.NewMergeRequest) {
  return db.insert(transform.mergeRequests)
    .values(mergeRequest)
    .onConflictDoUpdate({
      target: [
        transform.mergeRequests.externalId,
        transform.mergeRequests.forgeType
      ],
      set: {
        title: mergeRequest.title,
        description: mergeRequest.description,
        webUrl: mergeRequest.webUrl,
        _updatedAt: sql`(strftime('%s', 'now'))`,
      }
    })
    .returning();
}

function upsertForgeUser(db: DatabaseTransaction | TransformDatabase, forgeUser: transform.NewForgeUser) {
  return db.insert(transform.forgeUsers)
    .values(forgeUser)
    .onConflictDoUpdate({
      target: [
        transform.forgeUsers.externalId,
        transform.forgeUsers.forgeType,
      ],
      set: {
        name: forgeUser.name,
        bot: forgeUser.bot,
        _updatedAt: sql`(strftime('%s', 'now'))`,
      }
    })
}

function insertUserJunk(tx: SQLiteTransaction<"async", ResultSet, Record<string, unknown>, ExtractTablesWithRelations<Record<string, unknown>>>, users: transform.NewMergeRequestUsersJunk) {
  return tx.insert(transform.mergeRequestUsersJunk)
    .values(users)
    .returning();
}

function updateUserJunk(db: SQLiteTransaction<"async", ResultSet, Record<string, unknown>, ExtractTablesWithRelations<Record<string, unknown>>>, users: Omit<transform.MergeRequestUsersJunk, keyof TableMeta>) {
  return db.update(transform.mergeRequestUsersJunk)
    .set({
      ...users,
      _updatedAt: sql`(strftime('%s', 'now'))`,
    })
    .where(eq(transform.mergeRequestUsersJunk.id, users.id))
}

function insertDateJunk(tx: SQLiteTransaction<"async", ResultSet, Record<string, unknown>, ExtractTablesWithRelations<Record<string, unknown>>>, dates: transform.NewMergeRequestDatesJunk) {
  return tx.insert(transform.mergeRequestDatesJunk)
    .values(dates)
    .returning();
}

function updateDateJunk(tx: SQLiteTransaction<"async", ResultSet, Record<string, unknown>, ExtractTablesWithRelations<Record<string, unknown>>>, dates: Omit<transform.MergeRequestDatesJunk, keyof TableMeta>) {
  return tx.update(transform.mergeRequestDatesJunk)
    .set({
      ...dates,
      _updatedAt: sql`(strftime('%s', 'now'))`,
    })
    .where(eq(transform.mergeRequestDatesJunk.id, dates.id))
}

async function selectNullRows(db: TransformDatabase) {
  const { nullRows } = transform;

  const nullRowsData = await db.select({
    dateId: nullRows.dateId,
    userId: nullRows.userId,
    mergeRequestId: nullRows.mergeRequestId,
    repositoryId: nullRows.repositoryId,
  }).from(nullRows)
    .get();

  if (!nullRowsData) {
    throw new Error('No null rows found');
  }

  return nullRowsData;

}

type DMY = {
  year: number,
  month: number,
  day: number,
  week: string,
};

function getDMY(date: Date | null) {
  if (date === null) {
    return null;
  }
  return getDateInfo(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())))
}

function getDMYQuery(dmy: DMY | null) {
  if (dmy === null) {
    return undefined;
  }
  return and(
    eq(transform.dates.year, dmy.year),
    eq(transform.dates.month, dmy.month),
    eq(transform.dates.day, dmy.day),
    eq(transform.dates.week, dmy.week),
  );
}

function getDateIdOrNullDateId(dmy: DMY | null, datesData: {
  id: number;
  year: number;
  month: number;
  day: number;
  week: string;
}[], nullDateId: number) {
  if (dmy === null) {
    return {
      id: nullDateId,
    };
  }
  const date = datesData.find(({ year, month, day, week }) => year === dmy.year && month === dmy.month && day === dmy.day && week === dmy.week);
  if (!date) {
    console.error(`No date found for ${JSON.stringify(dmy)}`);
    return {
      id: nullDateId,
    };
  }
  return {
    id: date.id,
    day: date.day,
    month: date.month,
    year: date.year,
    week: date.week,
  };
}

async function upsertForgeUsers(db: TransformDatabase, members: extract.NewMember[]) {

  const uniqueMembers = members.reduce((acc, member) => {
    if (!acc.some(m => m.externalId === member.externalId)) {
      acc.push(member);
    }
    return acc;
  }, [] as extract.NewMember[]);


  const newForgeUsers = uniqueMembers.map((member) => ({
    externalId: member.externalId,
    forgeType: member.forgeType,
    name: member.name || member.username,
    bot: isMemberKnownBot(member.forgeType, member),
  } satisfies transform.NewForgeUser));

  const forgeUsers = await db.transaction(async tx => {
    return await Promise.all(newForgeUsers.map(x => upsertForgeUser(tx, x).returning().get()));
  });

  return forgeUsers satisfies transform.ForgeUser[];
}


async function selectDates(db: TransformDatabase, timestamps: Set<number>) {

  const query = [];

  for (const timestamp of timestamps) {
    query.push(getDMYQuery(getDMY(new Date(timestamp))));
  }

  const datesData = await db.select({
    id: transform.dates.id,
    year: transform.dates.year,
    month: transform.dates.month,
    day: transform.dates.day,
    week: transform.dates.week,
  }).from(transform.dates)
    .where(
      or(
        ...query
      )
    )
    .all();

  return datesData;
}

type MapUsersToJunksArgs = {
  author: transform.ForgeUser['id'] | null | undefined,
  mergedBy: transform.ForgeUser['id'] | null | undefined,
  approvers: transform.ForgeUser['id'][],
  committers: transform.ForgeUser['id'][],
  reviewers: transform.ForgeUser['id'][]
}

function getCommitter(gitIdentity: extract.CommittedEvent & { committerId: number | null }, members: extract.NewMember[]): extract.NewMember[] {

  function splitMembersByEmail(member: extract.NewMember, email: string) {
    if (member.email === email) {
      return [member];
    }
    return [member, {
      externalId: member.externalId,
      forgeType: member.forgeType,
      name: member.name,
      username: member.username,
      email: email,
    }] satisfies extract.NewMember[];
  }

  if (gitIdentity.committerId !== null) {
    const member = members.find((m) => m.externalId === gitIdentity.committerId);
    if (member) {
      return [member];
    }
  }

  // This should do anything? This should be removed
  const frags = gitIdentity.committerEmail.split("+");

  if (frags.length > 1) {
    const member = members.find((m) => Number(m.externalId) === Number(frags[0]));
    if (member) {
      return [member];
    }
  }

  let member = members.find((m) => m.email !== null && m.email?.toLowerCase() === gitIdentity.committerEmail?.toLowerCase());
  if (member) {
    return [member];
  }

  member = members.find((m) => m.name !== null && m.name?.toLowerCase() === gitIdentity.committerName.toLowerCase());
  if (member) {
    return splitMembersByEmail(member, gitIdentity.committerEmail);
  }

  member = members.find((m) => m.username.toLowerCase() === gitIdentity.committerName.toLowerCase());
  if (member) {
    return splitMembersByEmail(member, gitIdentity.committerEmail);
  }

  member = members.find((m) => !!m.name && compare(m.name, gitIdentity.committerName));
  if (member) {
    return splitMembersByEmail(member, gitIdentity.committerEmail);
  }

  member = members.find((m) => !!m.email && compare(m.email, gitIdentity.committerEmail));
  if (member) {
    return splitMembersByEmail(member, gitIdentity.committerEmail);
  }

  member = members.find((m) => m.username !== null && compare(m.username, gitIdentity.committerName));
  if (member) {
    return splitMembersByEmail(member, gitIdentity.committerEmail);
  }

  if (frags.length > 1) {
    return [{
      externalId: Number(frags[0]),
      forgeType: "github",
      name: gitIdentity.committerName,
      username: gitIdentity.committerName,
      email: gitIdentity.committerEmail,
    }] satisfies extract.NewMember[];
  }

  return [];
}


function mapUsersToJunk({ author, mergedBy, approvers, committers, reviewers }: MapUsersToJunksArgs, nullForgeUserId: number) {
  return {
    author: author || nullForgeUserId,
    mergedBy: mergedBy || nullForgeUserId,
    approver1: approvers[0] || nullForgeUserId,
    approver2: approvers[1] || nullForgeUserId,
    approver3: approvers[2] || nullForgeUserId,
    approver4: approvers[3] || nullForgeUserId,
    approver5: approvers[4] || nullForgeUserId,
    approver6: approvers[5] || nullForgeUserId,
    approver7: approvers[6] || nullForgeUserId,
    approver8: approvers[7] || nullForgeUserId,
    approver9: approvers[8] || nullForgeUserId,
    approver10: approvers[9] || nullForgeUserId,
    committer1: committers[0] || nullForgeUserId,
    committer2: committers[1] || nullForgeUserId,
    committer3: committers[2] || nullForgeUserId,
    committer4: committers[3] || nullForgeUserId,
    committer5: committers[4] || nullForgeUserId,
    committer6: committers[5] || nullForgeUserId,
    committer7: committers[6] || nullForgeUserId,
    committer8: committers[7] || nullForgeUserId,
    committer9: committers[8] || nullForgeUserId,
    committer10: committers[9] || nullForgeUserId,
    reviewer1: reviewers[0] || nullForgeUserId,
    reviewer2: reviewers[1] || nullForgeUserId,
    reviewer3: reviewers[2] || nullForgeUserId,
    reviewer4: reviewers[3] || nullForgeUserId,
    reviewer5: reviewers[4] || nullForgeUserId,
    reviewer6: reviewers[5] || nullForgeUserId,
    reviewer7: reviewers[6] || nullForgeUserId,
    reviewer8: reviewers[7] || nullForgeUserId,
    reviewer9: reviewers[8] || nullForgeUserId,
    reviewer10: reviewers[9] || nullForgeUserId,
  } satisfies transform.NewMergeRequestUsersJunk;
}

function calculateMrSize(mergeRequestId: number, diffs: { stringifiedHunks: string, newPath: string }[]): {
  mrSize: number,
  codeAddition: number,
  codeDeletion: number,
} {
  if (diffs.length === 0) {
    console.log("Warn: 0 Diffs found for merge request with id: ", mergeRequestId);
    return {
      mrSize: -1,
      codeAddition: -1,
      codeDeletion: -1,
    }
  }

  let mrSize = 0;
  let codeAddition = 0;
  let codeDeletion = 0;

  for (const diff of diffs) {
    const codeGenResult = isCodeGen(diff.newPath);

    if (codeGenResult === true) {
      continue;
    }

    const result = parseHunks(diff.stringifiedHunks);

    mrSize += result
      .map(({ additions, deletions }) => additions + deletions)
      .reduce((a, b) => a + b, 0);

    const { add, del } = result
      .map(({ additions, deletions }) => ({ add: additions, del: deletions }))
      .reduce((a, b) => ({ add: a.add + b.add, del: a.del + b.del }), { add: 0, del: 0 });

    codeAddition += add;
    codeDeletion += del;
  }

  return { mrSize, codeAddition, codeDeletion };
}

function calculateDuration(start: Date | null, end: Date | null) {
  if (!start || !end) {
    return 0;
  }
  return end.getTime() - start.getTime();
}

type MemberData = {
  forgeType: extract.Member['forgeType'];
  externalId: extract.Member['externalId'];
  name: extract.Member['name'];
  username: extract.Member['username'];
  email: extract.Member['email'];
}

type MergeRequestData = {
  openedAt: extract.MergeRequest['createdAt'],
  updatedAt: extract.MergeRequest['updatedAt'],
  mergedAt: extract.MergeRequest['mergedAt'],
  closedAt: extract.MergeRequest['closedAt'],
  externalId: extract.MergeRequest['externalId'],
  authorExternalId: extract.MergeRequest['authorExternalId']
}

export type TimelineEventData = {
  type: extract.TimelineEvents['type'];
  timestamp: extract.TimelineEvents['timestamp'];
  actorId: extract.TimelineEvents['actorId'];
  actorName: extract.TimelineEvents['actorName']; // is commitAuthorName for commit events
  actorEmail: extract.TimelineEvents['actorEmail'];
  data: extract.TimelineEvents['data'];
}

export type MergeRequestNoteData = {
  type: 'note';
  timestamp: extract.MergeRequestNote['createdAt'];
  authorExternalId: extract.MergeRequestNote['authorExternalId'];
}

async function selectExtractData(db: ExtractDatabase, extractMergeRequestId: number) {
  const { mergeRequests, mergeRequestDiffs, mergeRequestNotes, timelineEvents, repositories, namespaces, mergeRequestCommits } = extract;
  const mergeRequestData = await db.select({
    mergeRequest: {
      openedAt: mergeRequests.createdAt,
      mergedAt: mergeRequests.mergedAt,
      closedAt: mergeRequests.closedAt,
      externalId: mergeRequests.externalId,
      canonId: mergeRequests.canonId,
      authorExternalId: mergeRequests.authorExternalId,
      updatedAt: mergeRequests.updatedAt,
      repositoryId: mergeRequests.repositoryId,
      title: mergeRequests.title,
      description: mergeRequests.description,
      webUrl: mergeRequests.webUrl,
    }
  }).from(mergeRequests)
    .where(eq(mergeRequests.id, extractMergeRequestId))
    .get();

  const repositoryData = await db.select({
    repository: {
      externalId: repositories.externalId,
      name: repositories.name,
      forgeType: repositories.forgeType,
      namespaceName: namespaces.name,
    }
  }).from(repositories)
    .where(eq(repositories.id, mergeRequestData?.mergeRequest.repositoryId || 0))
    .innerJoin(namespaces, eq(namespaces.id, repositories.namespaceId))
    .get();

  const membersData = await db.select({
    forgeType: extract.members.forgeType,
    externalId: extract.members.externalId,
    name: extract.members.name,
    username: extract.members.username,
    email: extract.members.email,
  })
    .from(extract.members)
    .where(eq(extract.members.forgeType, repositoryData?.repository.forgeType || "github")) // idk man
    .all() satisfies MemberData[];

  const mergerRequestDiffsData = await db.select({
    stringifiedHunks: mergeRequestDiffs.diff,
    newPath: mergeRequestDiffs.newPath,
  })
    .from(mergeRequestDiffs)
    .where(eq(mergeRequestDiffs.mergeRequestId, extractMergeRequestId))
    .all();

  const mergeRequestNotesData = await db.select({
    timestamp: mergeRequestNotes.createdAt,
    authorExternalId: mergeRequestNotes.authorExternalId,
  })
    .from(mergeRequestNotes)
    .where(eq(mergeRequestNotes.mergeRequestId, extractMergeRequestId))
    .all() satisfies Omit<MergeRequestNoteData, 'type'>[];

  const timelineEventsData = await db.select({
    type: timelineEvents.type,
    timestamp: timelineEvents.timestamp,
    actorId: timelineEvents.actorId,
    actorName: timelineEvents.actorName,
    actorEmail: timelineEvents.actorEmail,
    data: timelineEvents.data
  })
    .from(timelineEvents)
    .where(eq(timelineEvents.mergeRequestId, extractMergeRequestId))
    .all() satisfies TimelineEventData[];

  const commitsData = await db.select({
    authorExternalId: mergeRequestCommits.authorExternalId,
    authorName: mergeRequestCommits.authorName,
    authorEmail: mergeRequestCommits.authorEmail,
    committedDate: mergeRequestCommits.committedDate,
    committerExternalId: mergeRequestCommits.committerExternalId,
    committerName: mergeRequestCommits.committerName,
    committerEmail: mergeRequestCommits.committerEmail,
    createdAt: mergeRequestCommits.createdAt,
  })
    .from(mergeRequestCommits)
    .where(eq(mergeRequestCommits.mergeRequestId, extractMergeRequestId))
    .all();


  return {
    diffs: mergerRequestDiffsData,
    ...mergeRequestData || { mergeRequest: null },
    notes: mergeRequestNotesData.map(note => ({ ...note, type: 'note' as const })),
    timelineEvents: timelineEventsData,
    ...repositoryData || { repository: null },
    members: membersData,
    commits: commitsData,
  };
}

export type RunContext = {
  extractDatabase: ExtractDatabase;
  transformDatabase: TransformDatabase;
};

export type TimelineMapKey = {
  type: extract.TimelineEvents['type'] | 'note',
  timestamp: Date,
}

function setupTimeline(timelineEvents: TimelineEventData[], notes: MergeRequestNoteData[]) {
  const timeline = new Map<TimelineMapKey,
    TimelineEventData | MergeRequestNoteData
  >();

  for (const timelineEvent of timelineEvents) {
    timeline.set({
      type: timelineEvent.type,
      timestamp: timelineEvent.timestamp,
    }, timelineEvent);
  }

  for (const note of notes) {
    timeline.set({
      type: 'note',
      timestamp: note.timestamp,
    }, note);
  }

  return timeline;

}

type calcTimelineArgs = {
  authorExternalId: extract.MergeRequest['authorExternalId'],
  createdAt: extract.MergeRequest['createdAt'] | null,
}


function getStartedCodingAt(timelineMapKeys: TimelineMapKey[], createdAt: Date | null) {
  const firstCommitEvent = timelineMapKeys.find(key => key.type === 'committed');

  if (!firstCommitEvent) return null;

  if (!createdAt) {
    return firstCommitEvent.timestamp;
  }

  return firstCommitEvent.timestamp < createdAt ? firstCommitEvent.timestamp : createdAt;
}

function getMergedAt(timelineMapKeys: TimelineMapKey[]) {
  const firstMergedEvent = timelineMapKeys.find(key => key.type === 'merged');

  if (firstMergedEvent) {
    return firstMergedEvent.timestamp;
  }

  return null;
}

export function calculateTimeline(timelineMapKeys: TimelineMapKey[], timelineMap: Map<TimelineMapKey, MergeRequestNoteData | TimelineEventData>, { authorExternalId, createdAt }: calcTimelineArgs) {

  const sortedTimelineMapKeys = [...timelineMapKeys]
  sortedTimelineMapKeys.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const committedEvents = sortedTimelineMapKeys.filter(key => key.type === 'committed');
  const lastCommitEvent = committedEvents[committedEvents.length - 1] || null;

  const startedCodingAt = getStartedCodingAt(committedEvents, createdAt);
  const mergedAt = getMergedAt(sortedTimelineMapKeys);

  const readyForReviewEvents = sortedTimelineMapKeys.filter(key => key.type === 'ready_for_review' || key.type === 'review_requested');
  const lastReadyForReviewEvent = readyForReviewEvents[readyForReviewEvents.length - 1] || null;

  const startedPickupAt = (() => {
    if (lastCommitEvent === null && lastReadyForReviewEvent === null) {
      return null;
    }
    if (lastReadyForReviewEvent === null && lastCommitEvent) {
      // problematic code: everything below is problematic
      const reviewedEventsBeforeLastCommitEvent = sortedTimelineMapKeys.filter(key => key.type === 'reviewed' && key.timestamp < lastCommitEvent.timestamp);
      const firstReviewedEventBeforeLastCommitEvent = reviewedEventsBeforeLastCommitEvent[0];
      if (firstReviewedEventBeforeLastCommitEvent) {
        return [...committedEvents].reverse().find(event => event.timestamp < firstReviewedEventBeforeLastCommitEvent.timestamp)?.timestamp || null;
      }

      return lastCommitEvent.timestamp;
    }
    if (lastReadyForReviewEvent && lastCommitEvent) {
      // problematic code: there could be a commit between last commit and lastReadyForReviewEvent
      const reviewedEventsAfterLastReadyForReviewEvent = sortedTimelineMapKeys.filter(
        key =>
          key.type === 'reviewed'
          && key.timestamp > lastReadyForReviewEvent.timestamp
          && key.timestamp < lastCommitEvent.timestamp
      );
      const firstReviewedEventAfterLastReadyForReviewEvent = reviewedEventsAfterLastReadyForReviewEvent[0]

      if (firstReviewedEventAfterLastReadyForReviewEvent) {
        const temp = [...committedEvents].reverse().find(
          event => event.timestamp > lastReadyForReviewEvent.timestamp
            && event.timestamp < firstReviewedEventAfterLastReadyForReviewEvent.timestamp

        )?.timestamp || null;

        if (temp) {
          return temp;
        }
        return lastReadyForReviewEvent.timestamp;
      }
      return lastReadyForReviewEvent.timestamp > lastCommitEvent.timestamp ? lastReadyForReviewEvent.timestamp : lastCommitEvent.timestamp;
    }

    return null;
  })();

  let firstReviewedEvent = null;
  let reviewed = false;
  let reviewDepth = 0;

  const noteEvents = timelineMapKeys.filter(key => key.type === 'note');
  for (const noteEvent of noteEvents) {
    const eventData = timelineMap.get(noteEvent) as MergeRequestNoteData | undefined;
    if (!eventData) {
      console.error('note event data not found', noteEvent);
      continue;
    }

    // Edge-case: what if note is before first review event ?
    const afterStartedPickupAt = startedPickupAt ? noteEvent.timestamp > startedPickupAt : true;
    const beforeMergedEvent = mergedAt ? noteEvent.timestamp < mergedAt : true;
    const isAuthorReviewer = eventData.authorExternalId === authorExternalId;
    if (afterStartedPickupAt && beforeMergedEvent && !isAuthorReviewer) {
      reviewDepth++;
    }
  }

  const reviewedEvents = timelineMapKeys.filter(key => key.type === 'reviewed' && key.timestamp < (mergedAt || new Date()));
  for (const reviewedEvent of reviewedEvents) {
    const eventData = timelineMap.get(reviewedEvent);
    if (!eventData) {
      console.error('reviewed event data not found', reviewedEvent);
      continue;
    }
    const res = extract.ReviewedEventSchema.safeParse((eventData as TimelineEventData).data);
    if (!res.success) {
      console.error(res.error);
      continue;
    }
    const isValidState = res.data.state === 'approved' || res.data.state === 'changes_requested' || res.data.state === 'commented';
    const afterStartedPickupAt = startedPickupAt ? reviewedEvent.timestamp > startedPickupAt : true;
    const beforeFirstReviewedEvent = firstReviewedEvent ? reviewedEvent.timestamp < firstReviewedEvent.timestamp : true;
    const beforeMergedEvent = mergedAt ? reviewedEvent.timestamp < mergedAt : true;
    const isAuthorReviewer = (eventData as TimelineEventData).actorId === authorExternalId;

    if (isValidState && afterStartedPickupAt && beforeMergedEvent && !isAuthorReviewer) {
      reviewed = true;
      reviewDepth++;
    }

    if (isValidState && afterStartedPickupAt && beforeFirstReviewedEvent && !isAuthorReviewer) {
      reviewed = true;
      firstReviewedEvent = reviewedEvent;
    }
  }

  return {
    startedCodingAt,
    startedPickupAt,
    startedReviewAt: firstReviewedEvent ? firstReviewedEvent.timestamp : null,
    mergedAt,
    reviewed,
    reviewDepth,
  };
}

function runTimeline(mergeRequestData: MergeRequestData, timelineEvents: TimelineEventData[], notes: MergeRequestNoteData[]) {
  const timelineMap = setupTimeline(timelineEvents, notes);
  const timelineMapKeys = [...timelineMap.keys()];

  const { startedCodingAt, startedReviewAt, startedPickupAt, reviewed, reviewDepth } = calculateTimeline(
    timelineMapKeys,
    timelineMap,
    {
      createdAt: mergeRequestData.openedAt,
      authorExternalId: mergeRequestData.authorExternalId,
    });

  // TODO: can this be optimized with the map ?
  const approved = timelineEvents.find(ev => ev.type === 'reviewed' && (ev.data as extract.ReviewedEvent).state === 'approved') !== undefined;


  const codingDuration = calculateDuration(startedCodingAt, startedPickupAt);
  const pickupDuration = calculateDuration(startedPickupAt, startedReviewAt);
  const reviewDuration = calculateDuration(startedReviewAt, mergeRequestData.closedAt);

  return {
    startedCodingAt,
    startedReviewAt,
    startedPickupAt,
    reviewed,
    reviewDepth,
    approved,
    codingDuration,
    pickupDuration,
    reviewDuration,
  }
}

function getMergeRequestTimestamps({
  mergeRequest,
  timelineEvents,
  notes
}: {
  mergeRequest: MergeRequestData,
  timelineEvents: TimelineEventData[],
  notes: MergeRequestNoteData[],
}) {
  const timestamps = new Set<number>();

  timestamps.add(mergeRequest.openedAt.getTime());
  if (mergeRequest.closedAt) timestamps.add(mergeRequest.closedAt.getTime());
  if (mergeRequest.mergedAt) timestamps.add(mergeRequest.mergedAt.getTime());
  if (mergeRequest.updatedAt) timestamps.add(mergeRequest.updatedAt.getTime());

  for (const timelineEvent of timelineEvents) {

    // Required for transform.MergeRequest['commitedAt']
    // new Date() required bcuz JSON.parse(done by drizzle) doesn't coerce ISO8601 strings
    if (timelineEvent.type === 'committed') timestamps.add(new Date((timelineEvent.data as extract.CommittedEvent).committedDate).getTime());

    timestamps.add(timelineEvent.timestamp.getTime());
  }

  for (const note of notes) {
    timestamps.add(note.timestamp.getTime());
  }

  // TODO: map to Dates ?
  return timestamps;
}

function getMergeRequestMembers({
  members,
  mergeRequest,
  timelineEvents,
  notes,
}: {
  members: extract.NewMember[],
  mergeRequest: MergeRequestData,
  timelineEvents: TimelineEventData[],
  notes: MergeRequestNoteData[],
}) {

  const membersArray = [];

  if (mergeRequest.authorExternalId !== null) {
    const author = members.find(m => m.externalId === mergeRequest.authorExternalId);
    if (author) membersArray.push(author);
  }

  for (const timelineEvent of timelineEvents) {
    const actor = members.find(m => m.externalId === timelineEvent.actorId);
    if (actor) {
      membersArray.push(actor);
    } else {
      const actor = members.find(m => m.email === timelineEvent.actorEmail);
      if (actor) {
        membersArray.push(actor);
      }
    }

    if (timelineEvent.type === 'committed') {
      membersArray.push(...getCommitter(timelineEvent.data as extract.CommittedEvent & { committerId: number | null }, members));
    }
  }

  for (const note of notes) {
    const author = members.find(m => m.externalId === note.authorExternalId);
    if (author) membersArray.push(author);
  }

  return membersArray;
}

export async function run(extractMergeRequestId: number, ctx: RunContext) {
  const extractData = await selectExtractData(ctx.extractDatabase, extractMergeRequestId);

  if (!extractData) {
    console.error(`No extract data found for merge request with id ${extractMergeRequestId}`);
    return null;
  }

  if (extractData.mergeRequest === null) {
    throw new Error(`No merge request found for id ${extractMergeRequestId}`);
  }

  if (extractData.repository === null) {
    throw new Error(`No repository found for id ${extractData.mergeRequest.repositoryId}`);
  }

  const { id: transformRepositoryId } = await upsertRepository(ctx.transformDatabase, {
    externalId: extractData.repository.externalId,
    forgeType: extractData.repository.forgeType,
    name: extractData.repository.name,
    namespaceName: extractData.repository.namespaceName,
  })
    .get();

  const { id: transformMergeRequestId } = await upsertMergeRequest(ctx.transformDatabase, {
    externalId: extractData.mergeRequest.externalId,
    canonId: extractData.mergeRequest.canonId,
    forgeType: extractData.repository.forgeType,
    title: extractData.mergeRequest.title,
    description: extractData.mergeRequest.description,
    webUrl: extractData.mergeRequest.webUrl,
  })
    .get();

  const {
    dateId: nullDateId,
    userId: nullUserId,
    mergeRequestId: _nullMergeRequestId,
    repositoryId: _nullRepositoryId
  } = await selectNullRows(ctx.transformDatabase);

  /**** Prepare timeline from commits ****/

  const preparedTimelineEvents = extractData.timelineEvents.filter(ev => ev.type !== 'committed');

  extractData.commits.forEach(commit => {
    preparedTimelineEvents.push({
      type: 'committed',
      timestamp: commit.committedDate,
      actorId: commit.authorExternalId,
      actorName: commit.authorName,
      actorEmail: commit.authorEmail,
      data: {
        committerId: commit.committerExternalId,
        committerName: commit.committerName,
        committerEmail: commit.committerEmail,
        committedDate: commit.committedDate,
      }
    });
  });
  /**** Prepare end ****/

  /**** MergeRequestMetrics ****/

  // Get users and dates junk if they exist
  const userAndDatesJunkIdsResult = await getUsersDatesMergeRequestMetricsId(ctx.transformDatabase, transformMergeRequestId).get();
  const usersJunkId = userAndDatesJunkIdsResult?.usersJunkId || null;
  const datesJunkId = userAndDatesJunkIdsResult?.datesJunkId || null;
  const mergeRequestMetricsId = userAndDatesJunkIdsResult?.mergeRequestMetricId || null;


  // Calculate the size for MergeRequestMetrics
  const {
    mrSize,
    codeAddition,
    codeDeletion,
  } = calculateMrSize(extractMergeRequestId, extractData.diffs.filter(Boolean));


  // Caluculate the rest of the metrics for MergeRequestMetrics
  const timeline = runTimeline(extractData.mergeRequest, extractData.timelineEvents, extractData.notes);


  // Calculate merged and closed for MergeRequestMetrics
  const merged = extractData.mergeRequest.mergedAt !== null;
  const closed = extractData.mergeRequest.closedAt !== null;

  /**** MergeRequestMetrics End ****/

  /**** MergeRequestDatesJunk ****/
  const mergeRequestTimestamps = getMergeRequestTimestamps({
    mergeRequest: extractData.mergeRequest,
    timelineEvents: extractData.timelineEvents,
    notes: extractData.notes,
  });

  const mergeRequestDates = await selectDates(ctx.transformDatabase, mergeRequestTimestamps);

  const timestampDateMap = new Map<number, transform.TransformDate['id']>();
  mergeRequestTimestamps.forEach(ts => {
    timestampDateMap.set(ts, getDateIdOrNullDateId(getDMY(new Date(ts)), mergeRequestDates, nullDateId).id);
  });

  const mergedAtId = timestampDateMap.get(extractData.mergeRequest.mergedAt?.getTime() || 0) || nullDateId;
  const closedAtId = timestampDateMap.get(extractData.mergeRequest.closedAt?.getTime() || 0) || nullDateId;
  const openedAtId = timestampDateMap.get(extractData.mergeRequest.openedAt.getTime() || 0) || nullDateId;
  const startedCodingAtId = timestampDateMap.get(timeline.startedCodingAt?.getTime() || 0) || nullDateId;
  const lastUpdatedAtId = timestampDateMap.get(extractData.mergeRequest.updatedAt?.getTime() || 0) || nullDateId;
  const startedPickupAtId = timestampDateMap.get(timeline.startedPickupAt?.getTime() || 0) || nullDateId;
  const startedReviewAtId = timestampDateMap.get(timeline.startedReviewAt?.getTime() || 0) || nullDateId;
  /**** MergeRequestDatesJunk end ****/


  /**** MergeRequestUsersJunk ****/
  const mergeRequestMembers = getMergeRequestMembers({
    members: extractData.members,
    mergeRequest: extractData.mergeRequest,
    timelineEvents: extractData.timelineEvents,
    notes: extractData.notes,
  });

  const forgeUsers = await upsertForgeUsers(ctx.transformDatabase, mergeRequestMembers);

  const memberEmailForgeUserIdMap = new Map<extract.Member['email'], transform.ForgeUser['id']>();
  const memberExternalIdForgeUserIdMap = new Map<extract.Member['externalId'], transform.ForgeUser['id']>();

  forgeUsers.forEach(forgeUser => {
    const members = mergeRequestMembers.filter(m => m.externalId === forgeUser.externalId);
    members.forEach(member => {
      if (member && member.email) {
        memberEmailForgeUserIdMap.set(member.email, forgeUser.id);
      }
      memberExternalIdForgeUserIdMap.set(forgeUser.externalId, forgeUser.id);
    });
  });

  const author = extractData.mergeRequest.authorExternalId
    ? memberExternalIdForgeUserIdMap.get(extractData.mergeRequest.authorExternalId) || nullUserId
    : nullUserId;
  const committers: number[] = [];
  const reviewers: number[] = [];
  const approvers: number[] = [];
  let mergedBy: number = nullUserId;

  const timelineEventForgeUsersIdsMap = new Map<TimelineEventData, { actorId: transform.ForgeUser['id'], committerId: transform.ForgeUser['id'] }>();

  for (const timelineEvent of extractData.timelineEvents) {
    let forgeUserId = nullUserId;
    if (timelineEvent.actorId) {
      forgeUserId = memberExternalIdForgeUserIdMap.get(timelineEvent.actorId) || nullUserId;
      timelineEventForgeUsersIdsMap.set(timelineEvent, { actorId: forgeUserId, committerId: nullUserId });
    }

    switch (timelineEvent.type) {
      case 'committed': {
        const committerId = (timelineEvent.data as { committerId: number | null }).committerId;
        if (committerId) {
          committers.push(committerId);
          timelineEventForgeUsersIdsMap.set(timelineEvent, { actorId: forgeUserId, committerId });
          break;
        }
        const committerEmail = (timelineEvent.data as extract.CommittedEvent).committerEmail;
        if (committerEmail) {
          const commiterId = memberEmailForgeUserIdMap.get(committerEmail) || nullUserId;
          if (commiterId) {
            committers.push(commiterId);
            timelineEventForgeUsersIdsMap.set(timelineEvent, { actorId: forgeUserId, committerId: commiterId });
          }
        }
        break;
      }
      case 'reviewed': {
        const forgeUserId =
          timelineEvent.actorId
            ? memberExternalIdForgeUserIdMap.get(timelineEvent.actorId) || nullUserId
            : nullUserId;
        reviewers.push(forgeUserId);
        if ((timelineEvent.data as extract.ReviewedEvent).state === 'approved') {
          approvers.push(forgeUserId);
        }
        break;
      }
      case 'merged': {
        const forgeUserId =
          timelineEvent.actorId
            ? memberExternalIdForgeUserIdMap.get(timelineEvent.actorId) || nullUserId
            : nullUserId;
        mergedBy = forgeUserId;
        break;
      }
    }
  }

  const usersJunk = mapUsersToJunk({
    author,
    mergedBy,
    approvers,
    committers,
    reviewers,
  }, nullUserId);
  /**** MergeRequestUsersJunk end ****/

  /**** MergeRequestEvents ****/
  const mergeRequestEvents: transform.NewMergeRequestEvent[] = [];

  extractData.timelineEvents.forEach((event) => {
    mergeRequestEvents.push({
      repository: transformRepositoryId,
      mergeRequest: transformMergeRequestId,
      timestamp: event.timestamp,
      occuredOn: timestampDateMap.get(event.timestamp.getTime()) || nullDateId,
      commitedAt: event.type === 'committed' ? timestampDateMap.get(new Date((event.data as extract.CommittedEvent).committedDate).getTime()) || nullDateId : nullDateId,
      actor: event.type === 'committed' ? timelineEventForgeUsersIdsMap.get(event)?.committerId || nullUserId : timelineEventForgeUsersIdsMap.get(event)?.actorId || nullUserId,
      subject: nullUserId,
      mergeRequestEventType: event.type,
      reviewState: 'unknown',
    });
  });

  extractData.notes.forEach((note) => {
    mergeRequestEvents.push({
      repository: transformRepositoryId,
      mergeRequest: transformMergeRequestId,
      timestamp: note.timestamp,
      occuredOn: timestampDateMap.get(note.timestamp.getTime()) || nullDateId,
      commitedAt: nullDateId,
      actor: memberExternalIdForgeUserIdMap.get(note.authorExternalId) || nullUserId,
      subject: nullUserId,
      mergeRequestEventType: 'noted',
      reviewState: 'unknown',
    });
  });

  const opened = {
    mergeRequest: transformMergeRequestId,
    mergeRequestEventType: 'opened',
    timestamp: extractData.mergeRequest.openedAt || new Date(0),
    occuredOn: openedAtId,
    commitedAt: nullDateId,
    actor: author,
    subject: nullUserId,
    repository: transformRepositoryId,
    reviewState: 'unknown',
  } satisfies transform.NewMergeRequestEvent;

  const startedCoding = {
    mergeRequest: transformMergeRequestId,
    mergeRequestEventType: 'started_coding',
    timestamp: timeline.startedCodingAt || new Date(0),
    occuredOn: startedCodingAtId,
    commitedAt: nullDateId,
    actor: author,
    subject: nullUserId,
    repository: transformRepositoryId,
    reviewState: 'unknown',
  } satisfies transform.NewMergeRequestEvent;

  const startedPickup = {
    mergeRequest: transformMergeRequestId,
    mergeRequestEventType: 'started_pickup',
    timestamp: timeline.startedPickupAt || new Date(0),
    occuredOn: startedPickupAtId,
    commitedAt: nullDateId,
    actor: author,
    subject: nullUserId,
    repository: transformRepositoryId,
    reviewState: 'unknown',
  } satisfies transform.NewMergeRequestEvent;

  const startedReview = {
    mergeRequest: transformMergeRequestId,
    mergeRequestEventType: 'started_review',
    timestamp: timeline.startedReviewAt || new Date(0),
    occuredOn: startedReviewAtId,
    commitedAt: nullDateId,
    actor: author,
    subject: nullUserId,
    repository: transformRepositoryId,
    reviewState: 'unknown',
  } satisfies transform.NewMergeRequestEvent;

  mergeRequestEvents.push(opened, startedCoding, startedPickup, startedReview);
  /**** MergeRequestEvents end ****/


  /**** DB update / insert ****/
  await ctx.transformDatabase.transaction(
    async (tx) => {
      if (mergeRequestMetricsId && datesJunkId && usersJunkId) {
        await updateDateJunk(tx, {
          id: datesJunkId,
          mergedAt: mergedAtId,
          closedAt: closedAtId,
          openedAt: openedAtId,
          startedCodingAt: startedCodingAtId,
          lastUpdatedAt: lastUpdatedAtId,
          startedPickupAt: startedPickupAtId,
          startedReviewAt: startedReviewAtId,
        }).run();

        await updateUserJunk(tx, {
          id: usersJunkId,
          ...usersJunk
        }).run();

        await updateMergeMetrics(tx, {
          id: mergeRequestMetricsId,
          datesJunk: datesJunkId,
          usersJunk: usersJunkId,
          mrSize,
          codeAddition,
          codeDeletion,
          codingDuration: timeline.codingDuration,
          pickupDuration: timeline.pickupDuration,
          reviewDuration: timeline.reviewDuration,
          handover: 0,
          reviewDepth: timeline.reviewDepth,
          merged,
          closed,
          approved: timeline.approved,
          reviewed: timeline.reviewed,
          repository: transformRepositoryId,
          mergeRequest: transformMergeRequestId,
        }).run();

      } else {

        const { id: dateJunkId } = await insertDateJunk(tx, {
          mergedAt: mergedAtId,
          closedAt: closedAtId,
          openedAt: openedAtId,
          startedCodingAt: startedCodingAtId,
          lastUpdatedAt: lastUpdatedAtId,
          startedPickupAt: startedPickupAtId,
          startedReviewAt: startedReviewAtId,
        }).get();

        const { id: userJunkId } = await insertUserJunk(tx, usersJunk).get();

        await insertMergeMetrics(tx, {
          mrSize,
          codeAddition,
          codeDeletion,
          codingDuration: timeline.codingDuration,
          pickupDuration: timeline.pickupDuration,
          reviewDuration: timeline.reviewDuration,
          handover: 0,
          reviewDepth: timeline.reviewDepth,
          merged,
          closed,
          approved: timeline.approved,
          reviewed: timeline.reviewed,
          usersJunk: userJunkId,
          datesJunk: dateJunkId,
          repository: transformRepositoryId,
          mergeRequest: transformMergeRequestId,
        }).run()

      }

      await deleteMergeRequestEvents(tx, transformMergeRequestId).run();
      await Promise.all(mergeRequestEvents.map(event => insertMergeRequestEvent(tx, event).run()));
    })
  /**** DB update / insert end ****/
}

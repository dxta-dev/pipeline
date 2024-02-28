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
import type { MergeRequestNoteEventData, MergeRequestCommitEventData, MergeRequestTimelineEventData, MergeRequestEventData } from './merge-request-event-data';
import { MergeRequestTimelineEventDataTypes } from './merge-request-event-data';


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
        avatarUrl: forgeUser.avatarUrl,
        profileUrl: forgeUser.profileUrl,
        _updatedAt: sql`(strftime('%s', 'now'))`,
      }
    })
}

function insertUserJunk(tx: DatabaseTransaction, users: transform.NewMergeRequestUsersJunk) {
  return tx.insert(transform.mergeRequestUsersJunk)
    .values(users)
    .returning();
}

function updateUserJunk(db: DatabaseTransaction, id: transform.MergeRequestUsersJunk['id'], users: transform.NewMergeRequestUsersJunk) {
  return db.update(transform.mergeRequestUsersJunk)
    .set({
      ...users,
      id,
      _updatedAt: sql`(strftime('%s', 'now'))`,
    })
    .where(eq(transform.mergeRequestUsersJunk.id, id))
}

function insertDateJunk(tx: DatabaseTransaction, dates: transform.NewMergeRequestDatesJunk) {
  return tx.insert(transform.mergeRequestDatesJunk)
    .values(dates)
    .returning();
}

function updateDateJunk(tx: DatabaseTransaction, id: transform.MergeRequestDatesJunk['id'], dates: transform.NewMergeRequestDatesJunk) {
  return tx.update(transform.mergeRequestDatesJunk)
    .set({
      ...dates,
      id,
      _updatedAt: sql`(strftime('%s', 'now'))`,
    })
    .where(eq(transform.mergeRequestDatesJunk.id, id))
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

/***** DATE MATHS START ******/
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
/***** DATE MATHS END   ******/

async function upsertForgeUsers(db: TransformDatabase, members: MemberData[]) {
  const newForgeUsers = members.map(member => ({
    externalId: member.externalId,
    forgeType: member.forgeType,
    name: member.name || member.username,
    avatarUrl: member.avatarUrl,
    profileUrl: member.profileUrl,
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

function matchGitIdentityToMember(
  gitIdentity: { name: string; email: string } | null,
  members: MemberData[]
): MemberData["externalId"] | null {
  if (!gitIdentity) return null;

  const { name, email } = gitIdentity;

  for (const m of members) {
    const id = m.externalId;
    if (!!m.name && m.name.toLowerCase() === name.toLowerCase()) return id;
    if (m.username.toLowerCase() === name.toLowerCase()) return id;
    if (!!m.name && compare(m.name, name)) return id;
    if (!!m.email && compare(m.email, email)) return id;
    if (compare(m.username, name)) return id;
  }

  return null;
}

function dirtyFixCommits({
  commits,
  members
}: {
  commits: MergeRequestCommitEventData[],
  members: MemberData[]
}) {
  for(const commit of commits) {
    if (!commit.author.externalId) {      
      commit.author.externalId = matchGitIdentityToMember(commit.author, members);      
    }
    if (commit.committer && !commit.committer.externalId) {
      commit.committer.externalId = matchGitIdentityToMember(commit.committer, members);
    }
  }
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
  avatarUrl: extract.Member['avatarUrl'];
  profileUrl: extract.Member['profileUrl'];
}

type MergeRequestData = {
  canonId: extract.MergeRequest['canonId'];
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
  data: extract.TimelineEvents['data'];
}

export type MergeRequestNoteData = {
  type: 'note';
  timestamp: extract.MergeRequestNote['createdAt'];
  authorExternalId: extract.MergeRequestNote['authorExternalId'];
}

export async function selectExtractData(db: ExtractDatabase, mergeRequestExtractId: number) {
  const mergeRequest = await db.select({
    openedAt: extract.mergeRequests.createdAt,
    mergedAt: extract.mergeRequests.mergedAt,
    closedAt: extract.mergeRequests.closedAt,
    externalId: extract.mergeRequests.externalId,
    canonId: extract.mergeRequests.canonId,
    authorExternalId: extract.mergeRequests.authorExternalId,
    updatedAt: extract.mergeRequests.updatedAt,
    repositoryId: extract.mergeRequests.repositoryId,
    title: extract.mergeRequests.title,
    description: extract.mergeRequests.description,
    webUrl: extract.mergeRequests.webUrl,
  }).from(extract.mergeRequests)
    .where(eq(extract.mergeRequests.id, mergeRequestExtractId))
    .get();

  if (!mergeRequest) return { mergeRequest: null }

  const repository = await db.select({
    externalId: extract.repositories.externalId,
    name: extract.repositories.name,
    forgeType: extract.repositories.forgeType,
    namespaceName: extract.namespaces.name,
  }).from(extract.repositories)
    .where(eq(extract.repositories.id, mergeRequest.repositoryId || 0))
    .innerJoin(extract.namespaces, eq(extract.namespaces.id, extract.repositories.namespaceId))
    .get();

  if (!repository) return { mergeRequest, repository: null }

  const members = await db.select({
    forgeType: extract.members.forgeType,
    externalId: extract.members.externalId,
    name: extract.members.name,
    username: extract.members.username,
    email: extract.members.email,
    profileUrl: extract.members.profileUrl,
    avatarUrl: extract.members.avatarUrl,
  }).from(extract.members)
    .where(eq(extract.members.forgeType, repository.forgeType || "github")) // idk man
    .all() satisfies MemberData[];

  const diffs = await db.select({
    stringifiedHunks: extract.mergeRequestDiffs.diff,
    newPath: extract.mergeRequestDiffs.newPath,
  })
    .from(extract.mergeRequestDiffs)
    .where(eq(extract.mergeRequestDiffs.mergeRequestId, mergeRequestExtractId))
    .all();

  const commits = await db.select({
    authorExternalId: extract.mergeRequestCommits.authorExternalId,
    authorName: extract.mergeRequestCommits.authorName,
    authorEmail: extract.mergeRequestCommits.authorEmail,
    authoredDate: extract.mergeRequestCommits.authoredDate,
    committerExternalId: extract.mergeRequestCommits.committerExternalId,
    committerName: extract.mergeRequestCommits.committerName,
    committerEmail: extract.mergeRequestCommits.committerEmail,
    committedDate: extract.mergeRequestCommits.committedDate,
  })
    .from(extract.mergeRequestCommits)
    .where(eq(extract.mergeRequestCommits.mergeRequestId, mergeRequestExtractId))
    .all()

  const notes = await db.select({
    createdAt: extract.mergeRequestNotes.createdAt,
    authorExternalId: extract.mergeRequestNotes.authorExternalId,
  })
    .from(extract.mergeRequestNotes)
    .where(eq(extract.mergeRequestNotes.mergeRequestId, mergeRequestExtractId))
    .all();

  const timelineEvents = await db.select({
    type: extract.timelineEvents.type,
    actorId: extract.timelineEvents.actorId,
    timestamp: extract.timelineEvents.timestamp,
    data: extract.timelineEvents.data,
  })
    .from(extract.timelineEvents)
    .where(eq(extract.timelineEvents.mergeRequestId, mergeRequestExtractId))
    .all();

  return {
    mergeRequest,
    repository,
    members,
    diffs,

    commits: commits.map(commit => ({
      type: "committed",
      timestamp: commit.authoredDate,
      authoredAt: commit.authoredDate,
      committedAt: commit.committedDate,
      author: {
        externalId: commit.authorExternalId,
        name: commit.authorName,
        email: commit.authorEmail
      },
      committer: (commit.committerEmail && commit.committerName) ? {
        externalId: commit.committerExternalId,
        name: commit.committerName,
        email: commit.committerEmail,
      } : null
    } satisfies MergeRequestCommitEventData)),

    notes: notes.map(note => ({
      type: "noted",
      authorExternalId: note.authorExternalId,
      timestamp: note.createdAt,
    } satisfies MergeRequestNoteEventData)),

    timelineEvents: timelineEvents.filter(event => MergeRequestTimelineEventDataTypes.includes(event.type as MergeRequestTimelineEventData['type']))
      .map(event => ({
        type: event.type as MergeRequestTimelineEventData['type'],
        actorExternalId: event.actorId,
        timestamp: event.timestamp,
        data: event.data,
      } satisfies MergeRequestTimelineEventData))
  }
}

/**** CALCULATIONS END   ****/

export type RunContext = {
  extractDatabase: ExtractDatabase;
  transformDatabase: TransformDatabase;
};

export type TimelineMapKey = {
  type: extract.TimelineEvents['type'] | 'note' | 'opened',
  timestamp: Date,
}
function setupTimeline(events: MergeRequestEventData[]) {
  const timeline = new Map<TimelineMapKey,
    TimelineEventData | MergeRequestNoteData
  >();

  for (const event of events) {
    if (event.type === 'noted') {
      timeline.set({
        type: "note",
        timestamp: event.timestamp,
      }, {
        type: "note",
        timestamp: event.timestamp,
        authorExternalId: event.authorExternalId
      })
    } else if (event.type === "committed") {
      timeline.set({
        type: "committed",
        timestamp: event.timestamp,
      }, {
        type: "committed",
        timestamp: event.timestamp,
        actorId: event.author.externalId,
        data: (event.committer ? {
          committerId: event.committer.externalId,
          committedDate: event.committedAt,
          committerEmail: event.committer.email,
          committerName: event.committer.name
        }: {
          committerId: null,
          committedDate: event.committedAt,
          committerEmail: null as unknown as string, // This is correct.
          committerName: null as unknown as string,
        }) satisfies (extract.CommittedEvent & { committerId: number | null}) ,
      })
    } else {
      timeline.set({
        type: event.type,
        timestamp: event.timestamp
      }, {
        type: event.type,
        timestamp: event.timestamp,
        actorId: event.actorExternalId,
        data: event.data,
      })
    }
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

type OpenedEventData =  {
  actorId : extract.MergeRequest['authorExternalId'],
  type : 'opened',
}

export function calculateTimeline(timelineMapKeys: TimelineMapKey[], timelineMap: Map<TimelineMapKey, MergeRequestNoteData | TimelineEventData | OpenedEventData>, { authorExternalId, createdAt }: calcTimelineArgs) {

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

  let prevActorId: number | null = null;
  let handover = 0;
  let isClosed = false;
  const handoverSortedTimelineMapKeys = [...sortedTimelineMapKeys];
  if (createdAt !== null) {
    const index = handoverSortedTimelineMapKeys.findIndex(key => key.timestamp >= createdAt);
    const openedEventKey = {timestamp: createdAt, type: 'opened'} as const;
    if (index === -1) {
      handoverSortedTimelineMapKeys.push(openedEventKey);
    } else {
      handoverSortedTimelineMapKeys.splice(index, 0, openedEventKey);
    }
    timelineMap.set(openedEventKey, {type: 'opened', actorId: authorExternalId});
  }
  handoverSortedTimelineMapKeys.forEach(key => {
    const value = timelineMap.get(key)
    if (value  && value.type === 'note') {
      const authorExternalId = value.authorExternalId;
      if (prevActorId !== null && authorExternalId !== prevActorId) {
        handover++;
      }
      prevActorId = authorExternalId;
      return;
    }

    if (value && value.type == "closed") {
      isClosed = true;
    }
    
    if (value && value.type === "committed" && !isClosed) {
      const actorId = (value.data as { committerId: number | null}).committerId;
      if (prevActorId !== null && actorId !== prevActorId) {
        handover++;
      }
      prevActorId = actorId;
      return;
    }

    if (value && value.type === "reviewed" && !isClosed) {
      const actorId = (value as unknown as TimelineEventData).actorId;
      const isStatePending = (value.data as extract.ReviewedEvent).state === 'pending';
    
      if (prevActorId !== null && actorId !== prevActorId && !isStatePending) {
        handover++;
      }
      if(!isStatePending) {
        prevActorId = actorId;
      }
      return;
    }

    if (value && !isClosed) {
      const actorId = (value as unknown as TimelineEventData).actorId;
      if (prevActorId !== null && actorId !== prevActorId) {
        handover++;
      }
      prevActorId = actorId;
      return;
    }
  });


 

  return {
    startedCodingAt,
    startedPickupAt,
    startedReviewAt: firstReviewedEvent ? firstReviewedEvent.timestamp : null,
    mergedAt,
    reviewed,
    reviewDepth,
    handover,
  };
}

function runTimeline(mergeRequestData: MergeRequestData, events: MergeRequestEventData[]) {
  const timelineMap = setupTimeline(events);
  const timelineMapKeys = [...timelineMap.keys()];

  const { startedCodingAt, startedReviewAt, startedPickupAt, reviewed, reviewDepth } = calculateTimeline(
    timelineMapKeys,
    timelineMap,
    {
      createdAt: mergeRequestData.openedAt,
      authorExternalId: mergeRequestData.authorExternalId,
    });

  // TODO: can this be optimized with the map ?
  const approved = events.find(ev => ev.type === 'reviewed' && (ev.data as extract.ReviewedEvent).state === 'approved') !== undefined;


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
  events,
  notes,
  commits,
}: {
  mergeRequest: MergeRequestData
  events: MergeRequestTimelineEventData[],
  notes: MergeRequestNoteEventData[],
  commits: MergeRequestCommitEventData[],
}) {
  const timestamps = new Set<number>();

  timestamps.add(mergeRequest.openedAt.getTime());
  if (mergeRequest.closedAt) timestamps.add(mergeRequest.closedAt.getTime());
  if (mergeRequest.mergedAt) timestamps.add(mergeRequest.mergedAt.getTime());
  if (mergeRequest.updatedAt) timestamps.add(mergeRequest.updatedAt.getTime());

  events.forEach(event => timestamps.add(event.timestamp.getTime()));
  notes.forEach(note => timestamps.add(note.timestamp.getTime()));

  commits.forEach(commit => {
    timestamps.add(commit.authoredAt.getTime());
    timestamps.add(commit.committedAt.getTime());
    timestamps.add(commit.timestamp.getTime());
  });

  return timestamps;
}

function getMergeRequestMembers({
  events,
  notes,
  commits,
  members
}: {
  events: MergeRequestTimelineEventData[],
  notes: MergeRequestNoteEventData[],
  commits: MergeRequestCommitEventData[],
  members: MemberData[],
}) {
  const presentMembers = new Set<extract.Member['externalId']>();
  events.forEach(event => {
    if (event.actorExternalId) presentMembers.add(event.actorExternalId);
  });
  notes.forEach(note => {
    presentMembers.add(note.authorExternalId);
  });
  commits.forEach(commit => {
    if (commit.author.externalId) presentMembers.add(commit.author.externalId);
    if (commit.committer?.externalId) presentMembers.add(commit.committer.externalId)
  });

  return members.filter(m => presentMembers.has(m.externalId));
}

export async function run(extractMergeRequestId: number, ctx: RunContext) {
  const extractData = await selectExtractData(ctx.extractDatabase, extractMergeRequestId);

  if (extractData.mergeRequest === null) {
    throw new Error(`No merge request found for id ${extractMergeRequestId}`);
  }

  if (extractData.repository === null) {
    throw new Error(`No repository found for id ${extractData.mergeRequest.repositoryId}`);
  }

  // match commiters that dont have externalId, mutates commits data
  dirtyFixCommits({
    commits: extractData.commits,
    members: extractData.members
  });

  /***** TRANSFORM CONTEXT CREATION START *****/
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

  const userAndDatesJunkIdsResult = await getUsersDatesMergeRequestMetricsId(ctx.transformDatabase, transformMergeRequestId).get();
  const usersJunkId = userAndDatesJunkIdsResult?.usersJunkId || null;
  const datesJunkId = userAndDatesJunkIdsResult?.datesJunkId || null;
  const mergeRequestMetricsId = userAndDatesJunkIdsResult?.mergeRequestMetricId || null;

  const {
    dateId: nullDateId,
    userId: nullUserId,
    mergeRequestId: _nullMergeRequestId,
    repositoryId: _nullRepositoryId
  } = await selectNullRows(ctx.transformDatabase);

  const mergeRequestMembers = getMergeRequestMembers({
    commits: extractData.commits,
    notes: extractData.notes,
    events: extractData.timelineEvents,
    members: extractData.members
  });
  const forgeUsers = await upsertForgeUsers(ctx.transformDatabase, mergeRequestMembers);
  const externalIdForgeUserMap = new Map<extract.Member['externalId'], transform.ForgeUser>();
  forgeUsers.forEach(forgeUser => {
    externalIdForgeUserMap.set(forgeUser.externalId, forgeUser)
  });

  const mergeRequestTimestamps = getMergeRequestTimestamps({
    mergeRequest: extractData.mergeRequest,
    events: extractData.timelineEvents,
    notes: extractData.notes,
    commits: extractData.commits,
  });
  const mergeRequestDates = await selectDates(ctx.transformDatabase, mergeRequestTimestamps);
  const timestampDateMap = new Map<number, transform.TransformDate['id']>();
  mergeRequestTimestamps.forEach(ts => {
    timestampDateMap.set(ts, getDateIdOrNullDateId(getDMY(new Date(ts)), mergeRequestDates, nullDateId).id);      
  });
  /***** TRANSFORM CONTEXT CREATION END   *****/

  // filter out bot events from the data sources
  const preparedTimelineEvents = extractData.timelineEvents.filter(event =>
    !event.actorExternalId || externalIdForgeUserMap.get(event.actorExternalId)?.bot !== true
  );
  const preparedNotes = extractData.notes.filter(note =>
    externalIdForgeUserMap.get(note.authorExternalId)?.bot !== true
  );
  const preparedCommits = extractData.commits.filter(commit => {
    if (commit.author.externalId && externalIdForgeUserMap.get(commit.author.externalId)?.bot === true) return false;
    if (commit.committer?.externalId && externalIdForgeUserMap.get(commit.committer.externalId)?.bot === true) return false;
    return true;
  });

  // construct unsorted timeline from the prepared data sources
  const mergeRequestEventsData = ([] as MergeRequestEventData[])
    .concat(preparedTimelineEvents, preparedNotes, preparedCommits);

  /**** MergeRequestMetrics ****/
  const {
    mrSize,
    codeAddition,
    codeDeletion,
  } = calculateMrSize(extractMergeRequestId, extractData.diffs.filter(Boolean));

  // Caluculate the rest of the metrics for MergeRequestMetrics
  const timeline = runTimeline(extractData.mergeRequest, mergeRequestEventsData);

  // Calculate merged and closed for MergeRequestMetrics
  const merged = extractData.mergeRequest.mergedAt !== null;
  const closed = extractData.mergeRequest.closedAt !== null;
  /**** MergeRequestMetrics End ****/

  /**** MergeRequestDatesJunk ****/
  const datesJunk = {
    mergedAt: timestampDateMap.get(extractData.mergeRequest.mergedAt?.getTime() || 0) || nullDateId,
    closedAt: timestampDateMap.get(extractData.mergeRequest.closedAt?.getTime() || 0) || nullDateId,
    openedAt: timestampDateMap.get(extractData.mergeRequest.openedAt.getTime() || 0) || nullDateId,
    startedCodingAt: timestampDateMap.get(timeline.startedCodingAt?.getTime() || 0) || nullDateId,
    lastUpdatedAt: timestampDateMap.get(extractData.mergeRequest.updatedAt?.getTime() || 0) || nullDateId,
    startedPickupAt: timestampDateMap.get(timeline.startedPickupAt?.getTime() || 0) || nullDateId,
    startedReviewAt: timestampDateMap.get(timeline.startedReviewAt?.getTime() || 0) || nullDateId,    
  } satisfies transform.NewMergeRequestDatesJunk;
  /**** MergeRequestDatesJunk end ****/

  /**** MergeRequestUsersJunk ****/
  const author = extractData.mergeRequest.authorExternalId ?
    externalIdForgeUserMap.get(extractData.mergeRequest.authorExternalId)?.id || nullUserId
    : nullUserId;
  const committers = [];
  const approvers = [];
  const reviewers = [];
  let mergedBy = nullUserId;

  for (const event of mergeRequestEventsData) {
    switch (event.type) {
      case "committed": {
        const forgeUserId = event.committer && event.committer.externalId
          ? externalIdForgeUserMap.get(event.committer.externalId)?.id || nullUserId
          : nullUserId;
          committers.push(forgeUserId);
        break;
      }
      case "reviewed": {
        const forgeUserId = event.actorExternalId
        ? externalIdForgeUserMap.get(event.actorExternalId)?.id || nullUserId
        : nullUserId;
        reviewers.push(forgeUserId);
        if ((event.data as extract.ReviewedEvent).state === 'approved') {
          approvers.push(forgeUserId);
        }
        break;
      }
      case "merged": {
        const forgeUserId = event.actorExternalId
        ? externalIdForgeUserMap.get(event.actorExternalId)?.id || nullUserId
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

  mergeRequestEventsData.forEach(event => {
    let actor = nullUserId;
    let commitedAt = nullDateId;
    switch (event.type) {
      case "committed": {
        if (event.committer?.externalId) actor = externalIdForgeUserMap.get(event.committer?.externalId)?.id || nullUserId;
        commitedAt = timestampDateMap.get(event.committedAt.getTime()) || nullDateId;
        break;
      }
      case "noted": {
        actor = externalIdForgeUserMap.get(event.authorExternalId)?.id || nullUserId;
        break;
      }
      default: {
        if (event.actorExternalId) actor = externalIdForgeUserMap.get(event.actorExternalId)?.id || nullUserId;
        break;
      }
    }
    mergeRequestEvents.push({
      repository: transformRepositoryId,
      mergeRequest: transformMergeRequestId,
      timestamp: event.timestamp,
      occuredOn: timestampDateMap.get(event.timestamp.getTime()) || nullDateId,
      commitedAt,
      actor,
      subject: nullUserId,
      mergeRequestEventType: event.type,
      reviewState: 'unknown',
    } satisfies transform.NewMergeRequestEvent);
  });

  const opened = {
    mergeRequest: transformMergeRequestId,
    mergeRequestEventType: 'opened',
    timestamp: extractData.mergeRequest.openedAt || new Date(0),
    occuredOn: datesJunk.openedAt,
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
    occuredOn: datesJunk.startedCodingAt,
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
    occuredOn: datesJunk.startedPickupAt,
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
    occuredOn: datesJunk.startedReviewAt,
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
        await updateDateJunk(tx, datesJunkId, datesJunk).run();
        await updateUserJunk(tx, usersJunkId, usersJunk).run();

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

        const { id: dateJunkId } = await insertDateJunk(tx, datesJunk).get();
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

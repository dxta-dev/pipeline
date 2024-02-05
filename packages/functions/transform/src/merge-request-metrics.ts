import * as extract from '@acme/extract-schema';
import * as transform from '@acme/transform-schema';
import { sql, eq, or, and, type ExtractTablesWithRelations, inArray, type SQL } from "drizzle-orm";
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import { isCodeGen } from './is-codegen';
import { parseHunks } from './parse-hunks';
import { type SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import { type ResultSet } from '@libsql/client/.';
import { isMemberKnownBot } from './known-bots';
import { getDateInfo } from '../../../schemas/transform/src/seed/dimensions';

type BrandedDatabase<T> = LibSQLDatabase<Record<string, never>> & { __brand: T }

export type TransformDatabase = BrandedDatabase<'transform'>;
export type ExtractDatabase = BrandedDatabase<'extract'>;
type TableMeta = {
  _createdAt: Date | null;
  _updatedAt: Date | null;
}

function selectMetricInfo(db: TransformDatabase, transformMergeRequestId: number) {
  return db.select({
    usersJunk: transform.mergeRequestMetrics.usersJunk,
    datesJunk: transform.mergeRequestMetrics.datesJunk,
    id: transform.mergeRequestMetrics.id,
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

function insertMergeRequestEvents(tx: SQLiteTransaction<"async", ResultSet, Record<string, unknown>, ExtractTablesWithRelations<Record<string, unknown>>>, mergeRequestEvents: transform.NewMergeRequestEvent[]) {
  return tx.insert(transform.mergeRequestEvents)
    .values(mergeRequestEvents);
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
        webUrl: mergeRequest.webUrl,
        _updatedAt: sql`(strftime('%s', 'now'))`,
      }
    })
    .returning();
}

function upsertForgeUser(db: TransformDatabase, forgeUser: transform.NewForgeUser) {
  return db.insert(transform.forgeUsers)
    .values(forgeUser)
    .onConflictDoUpdate({
      target: [
        transform.forgeUsers.externalId,
        transform.forgeUsers.forgeType,
      ],
      set: {
        name: forgeUser.name,
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

type mapDatesToTransformedDatesArgs = {
  openedAt: Date,
  mergedAt: Date | null,
  closedAt: Date | null,
  startedCodingAt: Date | null,
  startedPickupAt: Date | null,
  startedReviewAt: Date | null,
  lastUpdatedAt: Date | null,
};

type DMY = {
  year: number,
  month: number,
  day: number,
  week: string,
};

type selectDatesArgs = {
  openedAt: DMY | null,
  mergedAt: DMY | null,
  closedAt: DMY | null,
  startedCodingAt: DMY | null,
  startedPickupAt: DMY | null,
  startedReviewAt: DMY | null,
  lastUpdatedAt: DMY | null,
};

function getDMY(date: Date | null) {
  if (date === null) {
    return null;
  }
  return getDateInfo(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())))
}

async function mapDatesToTransformedDates(db: TransformDatabase, dates: mapDatesToTransformedDatesArgs, nullDateId: number) {

  const transformDates = await selectDates(db, {
    openedAt: getDMY(dates.openedAt),
    mergedAt: getDMY(dates.mergedAt),
    closedAt: getDMY(dates.closedAt),
    startedCodingAt: getDMY(dates.startedCodingAt),
    startedPickupAt: getDMY(dates.startedPickupAt),
    startedReviewAt: getDMY(dates.startedReviewAt),
    lastUpdatedAt: getDMY(dates.lastUpdatedAt),
  }, nullDateId);

  return transformDates;
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

function getUserIdOrNullUserId(userIdentifier: string | number | null, forgeUsersData: {
  id: number;
  name: string;
  externalId: number;
}[], nullUserId: number) {
  if (userIdentifier === null) {
    return {
      id: nullUserId,
    }
  }
  let user;
  if (typeof userIdentifier === 'number') {
    user = forgeUsersData.find(({ externalId }) => externalId === userIdentifier);
  } else {
    user = forgeUsersData.find(({ name }) => name === userIdentifier);
  }
  if (!user) {
    return {
      id: nullUserId,
    };
  }

  return {
    id: user.id,
    name: user.name,
    externalId: user.externalId,
  };
}

async function selectDates(db: TransformDatabase, dates: selectDatesArgs, nullDateId: number) {

  const { dates: transformDates } = transform;

  const datesData = await db.select({
    id: transformDates.id,
    year: transformDates.year,
    month: transformDates.month,
    day: transformDates.day,
    week: transformDates.week,
  }).from(transformDates)
    .where(
      or(
        getDMYQuery(dates.openedAt),
        getDMYQuery(dates.mergedAt),
        getDMYQuery(dates.closedAt),
        getDMYQuery(dates.startedCodingAt),
        getDMYQuery(dates.startedPickupAt),
        getDMYQuery(dates.startedReviewAt),
        getDMYQuery(dates.lastUpdatedAt),
      )
    )
    .all();

  return {
    openedAt: getDateIdOrNullDateId(dates.openedAt, datesData, nullDateId),
    mergedAt: getDateIdOrNullDateId(dates.mergedAt, datesData, nullDateId),
    closedAt: getDateIdOrNullDateId(dates.closedAt, datesData, nullDateId),
    startedCodingAt: getDateIdOrNullDateId(dates.startedCodingAt, datesData, nullDateId),
    startedPickupAt: getDateIdOrNullDateId(dates.startedPickupAt, datesData, nullDateId),
    startedReviewAt: getDateIdOrNullDateId(dates.startedReviewAt, datesData, nullDateId),
    lastUpdatedAt: getDateIdOrNullDateId(dates.lastUpdatedAt, datesData, nullDateId),
  };
}

type MapUsersToJunksArgs = {
  author: transform.ForgeUser['id'] | null | undefined,
  mergedBy: transform.ForgeUser['id'] | null | undefined,
  approvers: transform.ForgeUser['id'][],
  committers: transform.ForgeUser['id'][],
  reviewers: transform.ForgeUser['id'][]
}

type MappedUsersTypesArgs = {
  author: number,
  mergedBy: number | null,
  approvers: number[],
  committers: string[],
  reviewers: number[]
}

type TransformUserArgs = {
  externalId: transform.ForgeUser['externalId'];
  name: transform.ForgeUser['name'];
  forgeType: transform.ForgeUser['forgeType'];
  bot: transform.ForgeUser['bot'];
}

function getUserData(timelineEvents: TimelineEventData[], authorExternalId: number) {
  const reviewers = new Set<number>();
  const approvers = new Set<number>();
  const committers = new Set<string>();
  let mergedBy: number | undefined;
  const author: number = authorExternalId;

  for (const timelineEvent of timelineEvents) {
    switch (timelineEvent.type) {
      case 'reviewed':
        if (!timelineEvent.actorId) {
          break;
        }
        reviewers.add(timelineEvent.actorId);
        if (timelineEvent.data && ((timelineEvent.data as extract.ReviewedEvent).state === 'approved')) {
          approvers.add(timelineEvent.actorId);
        }
        break;
      case 'committed':
        committers.add((timelineEvent.data as extract.CommittedEvent).committerName);
        break;
      case 'merged':
        if (!timelineEvent.actorId) {
          break;
        }
        mergedBy = timelineEvent.actorId;
        break;
      default:
        break;
    }
  }

  return {
    author,
    mergedBy: mergedBy ? mergedBy : null,
    approvers: [...approvers.keys()],
    committers: [...committers.keys()],
    reviewers: [...reviewers.keys()],
  };
}

async function getTransformUserData(extractDb: ExtractDatabase, transformDb: TransformDatabase, users: MappedUsersTypesArgs) {
  const { author, mergedBy, approvers, committers, reviewers } = users;
  const allUsers = new Set<number>();
  const transformUsers: transform.ForgeUser[] = [];
  allUsers.add(author);
  if (mergedBy) {
    allUsers.add(mergedBy);
  }
  approvers.forEach((approver) => { { allUsers.add(approver); } });
  reviewers.forEach((reverse) => { { allUsers.add(reverse); } });


  const response = await extractDb
    .select({
      externalId: extract.members.externalId,
      name: extract.members.name,
      forgeType: extract.members.forgeType,
      username: extract.members.username,
    })
    .from(extract.members)
    .where(
      or(
        allUsers.size > 0 ? inArray(extract.members.externalId, [...allUsers.keys()]) : undefined,
        committers.length > 0 ? inArray(extract.members.name, committers) : undefined,
        committers.length > 0 ? inArray(extract.members.username, committers) : undefined,
      ),
    )
    .all();

  for (const res of response) {
    transformUsers.push(await upsertForgeUser(transformDb, {
      externalId: res.externalId,
      forgeType: res.forgeType,
      name: res.name || res.username,
      bot: isMemberKnownBot(res.forgeType, res),
    } satisfies TransformUserArgs).returning().get());
  }

  const transformAuthor = transformUsers.find(({ externalId }) => externalId === author)?.id;
  const transformMergedBy = transformUsers.find(({ externalId }) => externalId === mergedBy)?.id;
  const transformApprovers = approvers.map((approver) => transformUsers.find(({ externalId }) => externalId === approver)?.id as number);
  const transformCommitters = committers.map((committer) => transformUsers.find(({ name }) => name === committer)?.id as number);
  const transformReviewers = reviewers.map((reviewer) => transformUsers.find(({ externalId }) => externalId === reviewer)?.id as number);

  return {
    author: transformAuthor ? transformAuthor : null,
    mergedBy: transformMergedBy ? transformMergedBy : null,
    approvers: transformApprovers ? transformApprovers : [],
    committers: transformCommitters ? transformCommitters : [],
    reviewers: transformReviewers ? transformReviewers : [],
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

function calculateMrSize(mergeRequestId: number, diffs: { stringifiedHunks: string, newPath: string }[]): number | null {
  if (diffs.length === 0) {
    console.log("Warn: 0 Diffs found for merge request with id: ", mergeRequestId);
    return null;
  }

  let mrSize = 0;

  for (const diff of diffs) {


    const codeGenResult = isCodeGen(diff.newPath);

    if (codeGenResult === true) {
      // console.error(new Error(`This file is part of codeGen: ${diff.newPath} on merge request with id: ${mergeRequestId}`));
      continue;
    }

    mrSize += parseHunks(diff.stringifiedHunks)
      .map(({ additions, deletions }) => additions + deletions)
      .reduce((a, b) => a + b, 0);
  }

  return mrSize;
}

function calculateDuration(start: Date | null, end: Date | null) {
  if (!start || !end) {
    return 0;
  }
  return end.getTime() - start.getTime();
}

type MergeRequestData = {
  openedAt: extract.MergeRequest['createdAt'],
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

async function selectExtractData(db: ExtractDatabase, extractMergeRequestId: number) {
  const { mergeRequests, mergeRequestDiffs, mergeRequestNotes, timelineEvents, repositories } = extract;

  const mergeRequestData = await db.select({
    mergeRequest: {
      openedAt: mergeRequests.createdAt,
      mergedAt: mergeRequests.mergedAt,
      closedAt: mergeRequests.closedAt,
      externalId: mergeRequests.externalId,
      authorExternalId: mergeRequests.authorExternalId,
      updatedAt: mergeRequests.updatedAt,
      repositoryId: mergeRequests.repositoryId,
      title: mergeRequests.title,
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
    }
  }).from(repositories)
    .where(eq(repositories.id, mergeRequestData?.mergeRequest.repositoryId || 0))
    .get();

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
    data: timelineEvents.data
  })
    .from(timelineEvents)
    .where(eq(timelineEvents.mergeRequestId, extractMergeRequestId))
    .all() satisfies TimelineEventData[];

  return {
    diffs: mergerRequestDiffsData,
    ...mergeRequestData || { mergeRequest: null },
    notes: mergeRequestNotesData.map(note => ({ ...note, type: 'note' as const })),
    timelineEvents: timelineEventsData,
    ...repositoryData || { repository: null },
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

  return {
    startedCodingAt,
    startedReviewAt,
    startedPickupAt,
    reviewed,
    reviewDepth,
    approved,
  }
}


async function selectEventDates<K>(db: TransformDatabase, dates: { key: K, dmy: DMY | null }[], nullDateId: number) {

  const { dates: transformDates } = transform;

  const dmyQuery = dates.map(d => getDMYQuery(d.dmy));

  const datesData = await db.select({
    id: transformDates.id,
    year: transformDates.year,
    month: transformDates.month,
    day: transformDates.day,
    week: transformDates.week,
  }).from(transformDates)
    .where(
      or(
        ...dmyQuery
      )
    )
    .all();


  return dates.map(d => ({ key: d.key, dateId: getDateIdOrNullDateId(d.dmy, datesData, nullDateId) }));
}

async function selectForgeUsers<K>(db: TransformDatabase, users: { key: K, userId: number | null, type: string, data: unknown }[], nullUserId: number, isActor: boolean) {
  const { forgeUsers: transformForgeUsers } = transform;
  const userQuery: (SQL<unknown> | undefined)[] = [];
  const uniqueUserQuery = new Map();

  if (isActor) {
    users.forEach(u => {
      if (u.type === 'committed') {
        const committerName = (u.data as extract.CommittedEvent).committerName;
        if (!uniqueUserQuery.has(committerName)) {
          uniqueUserQuery.set(committerName, committerName);
          userQuery.push(eq(transformForgeUsers.name, committerName));
        }
      } else if (u.userId !== null) {
        if (!uniqueUserQuery.has(u.userId)) {
          uniqueUserQuery.set(u.userId, u.userId);
          userQuery.push(eq(transformForgeUsers.externalId, u.userId))
        }
      }
    })
  } else {
    users.forEach(u => {
      switch (u.type) {
        case 'assigned':
          const assigneeId = (u.data as extract.AssignedEvent).assigneeId;
          if (!uniqueUserQuery.has(assigneeId)) {
            uniqueUserQuery.set(assigneeId, assigneeId);
            userQuery.push(eq(transformForgeUsers.externalId, assigneeId));
          }
          break;
        case 'unassigned':
          const unassigneeId = (u.data as extract.AssignedEvent).assigneeId;
          if (!uniqueUserQuery.has(unassigneeId)) {
            uniqueUserQuery.set(unassigneeId, unassigneeId);
            userQuery.push(eq(transformForgeUsers.externalId, unassigneeId));
          }
          break;
        case 'review_requested':
          const requestedReviewerId = (u.data as extract.ReviewRequestedEvent).requestedReviewerId;
          if (requestedReviewerId !== undefined && !uniqueUserQuery.has(requestedReviewerId)) {
            uniqueUserQuery.set(requestedReviewerId, requestedReviewerId);
            userQuery.push(eq(transformForgeUsers.externalId, requestedReviewerId));
          }
          break;
        case 'review_request_removed':
          const requestedReviewerRemovedId = (u.data as extract.ReviewRequestRemovedEvent).requestedReviewerId;
          if (requestedReviewerRemovedId !== undefined && !uniqueUserQuery.has(requestedReviewerRemovedId)) {
            uniqueUserQuery.set(requestedReviewerRemovedId, requestedReviewerRemovedId);
            userQuery.push(eq(transformForgeUsers.externalId, requestedReviewerRemovedId));
          }
          break;
        default:
          break;
      }
    });
  }

  const forgeUsersData = await db.select({
    id: transformForgeUsers.id,
    externalId: transformForgeUsers.externalId,
    name: transformForgeUsers.name,
  }).from(transformForgeUsers)
    .where(
      or(
        ...userQuery
      )
    )
    .all();

  return users.map(u => {
    let userIdentifier;
    if (isActor) {
      if (u.type === 'committed') {
        userIdentifier = (u.data as extract.CommittedEvent).committerName;
      } else {
        userIdentifier = u.userId;
      }
    } else {
      switch (u.type) {
        case 'assigned':
          userIdentifier = (u.data as extract.AssignedEvent).assigneeId;
          break;
        case 'unassigned':
          userIdentifier = (u.data as extract.UnassignedEvent).assigneeId;
          break;
        case 'review_requested':
          const requestedReviewerId = (u.data as extract.ReviewRequestedEvent).requestedReviewerId;
          userIdentifier = requestedReviewerId === undefined ? null : requestedReviewerId;
          break;
        case 'review_request_removed':
          const unrequestedReviewerId = (u.data as extract.ReviewRequestRemovedEvent).requestedReviewerId
          userIdentifier = unrequestedReviewerId === undefined ? null : unrequestedReviewerId;
          break;
        default:
          userIdentifier = null;
          break;
      }
    }
    return {
      key: u.key,
      userId: getUserIdOrNullUserId(userIdentifier, forgeUsersData, nullUserId),
    }
  });
}

async function selectCommittedDates(db: TransformDatabase, users: { key: { type: string, timestamp: Date }, type: string, data: unknown }[], nullDateId: number) {
  const { dates: transformDates } = transform;
  const committedDates: DMY[] = [];
  const uniqueDateQuery = new Map();

  users.forEach(u => {
    if (u.type === 'committed') {
      const committedDate = new Date((u.data as extract.CommittedEvent).committedDate);
      if (!uniqueDateQuery.has(committedDate)) {
        uniqueDateQuery.set(committedDate, committedDate);
        const committedDateDMY = getDMY(committedDate);
        committedDates.push(committedDateDMY as DMY);
      }
    }
  })

  const dmyQuery = committedDates.map(d => getDMYQuery(d));

  const datesData = await db.select({
    id: transformDates.id,
    year: transformDates.year,
    month: transformDates.month,
    day: transformDates.day,
    week: transformDates.week,
  }).from(transformDates)
    .where(
      or(
        ...dmyQuery
      )
    )
    .all();

  return users.map(u => {
    let committedDate: Date | null = null;
    if (u.type === 'committed') {
      committedDate = new Date((u.data as extract.CommittedEvent).committedDate);
    }
    return {
      key: u.key,
      committedDateId: getDateIdOrNullDateId(getDMY(committedDate), datesData, nullDateId)
    }
  });
}


type MetricsEvents = {
  opened: transform.NewMergeRequestEvent,
  startedCoding: transform.NewMergeRequestEvent,
  startedPickup: transform.NewMergeRequestEvent,
  startedReview: transform.NewMergeRequestEvent,
}

function createMetricEvents(
  mrAuthorId: number,
  openedAt: Date | null,
  openedAtId: number,
  startedCodingAt: Date | null,
  startedCodingAtId: number,
  startedPickupAt: Date | null,
  startedPickupAtId: number,
  startedReviewAt: Date | null,
  startedReviewAtId: number,
  repositoryId: number,
  mergeRequestId: number,
  nullDateId: number,
  nullUserId: number,
): MetricsEvents {

  return {
    opened: {
      mergeRequest: mergeRequestId,
      mergeRequestEventType: 'opened',
      timestamp: openedAt || new Date(0),
      occuredOn: openedAtId,
      commitedAt: nullDateId,
      actor: mrAuthorId,
      subject: nullUserId,
      repository: repositoryId,
      reviewState: 'unknown',
    },
    startedCoding: {
      mergeRequest: mergeRequestId,
      mergeRequestEventType: 'started_coding',
      timestamp: startedCodingAt || new Date(0),
      occuredOn: startedCodingAtId,
      commitedAt: nullDateId,
      actor: nullUserId,
      subject: nullUserId,
      repository: repositoryId,
      reviewState: 'unknown',
    },
    startedPickup: {
      mergeRequest: mergeRequestId,
      mergeRequestEventType: 'started_pickup',
      timestamp: startedPickupAt || new Date(0),
      occuredOn: startedPickupAtId,
      commitedAt: nullDateId,
      actor: nullUserId,
      subject: nullUserId,
      repository: repositoryId,
      reviewState: 'unknown',
    },
    startedReview: {
      mergeRequest: mergeRequestId,
      mergeRequestEventType: 'started_review',
      timestamp: startedReviewAt || new Date(0),
      occuredOn: startedReviewAtId,
      commitedAt: nullDateId,
      actor: nullUserId,
      subject: nullUserId,
      repository: repositoryId,
      reviewState: 'unknown',
    }
  }
}

async function upsertMergeRequestEvents(
  tx: SQLiteTransaction<"async", ResultSet, Record<string, unknown>, ExtractTablesWithRelations<Record<string, unknown>>>,
  db: TransformDatabase,
  repositoryId: transform.Repository['id'],
  mergeRequestId: transform.MergeRequest['id'],
  timelineEvents: TimelineEventData[],
  nullDateId: number,
  nullUserId: number,
  metricEvents: MetricsEvents
) {
  const transformDates = await selectEventDates(
    db,
    timelineEvents.map(t => ({
      key: { type: t.type, timestamp: t.timestamp },
      dmy: getDMY(t.timestamp)
    })),
    nullDateId
  );

  const transformForgeUserActors = await selectForgeUsers(
    db,
    timelineEvents.map(t => ({
      key: { type: t.type, timestamp: t.timestamp },
      userId: t.actorId,
      type: t.type,
      data: t.data
    })),
    nullUserId,
    true
  );

  const transformForgeUserSubjects = await selectForgeUsers(
    db,
    timelineEvents.map(t => ({
      key: { type: t.type, timestamp: t.timestamp },
      type: t.type,
      data: t.data,
      userId: null
    })),
    nullUserId,
    false
  );

  const transformCommittedDates = await selectCommittedDates(
    db,
    timelineEvents.map(t => ({
      key: { type: t.type, timestamp: t.timestamp },
      type: t.type,
      data: t.data
    })),
    nullDateId,
  );

  const events: transform.NewMergeRequestEvent[] = timelineEvents.map(timelineEvent => {
    const td = transformDates.find(td => td.key.type === timelineEvent.type && td.key.timestamp.getTime() === timelineEvent.timestamp.getTime());
    const tfua = transformForgeUserActors.find(tfu => tfu.key.type === timelineEvent.type && tfu.key.timestamp.getTime() === timelineEvent.timestamp.getTime());
    const tfus = transformForgeUserSubjects.find(tfu => tfu.key.type === timelineEvent.type && tfu.key.timestamp.getTime() === timelineEvent.timestamp.getTime());
    const tcd = transformCommittedDates.find(tfu => tfu.key.type === timelineEvent.type && tfu.key.timestamp.getTime() === timelineEvent.timestamp.getTime());

    let type: transform.MergeRequestEventType;

    switch (timelineEvent.type) {
      case 'assigned':
      case 'unassigned':
      case 'review_request_removed':
      case 'review_requested':
      case 'closed':
      case 'convert_to_draft':
      case 'commented':
      case 'merged':
      case 'ready_for_review':
      case 'reviewed':
      case 'committed':
        type = timelineEvent.type;
        break;
      default:
        type = 'unknown';
        break;
    }
    return {
      mergeRequest: mergeRequestId,
      mergeRequestEventType: type,
      timestamp: timelineEvent.timestamp,
      occuredOn: td?.dateId.id ? td.dateId.id : nullDateId,
      commitedAt: tcd?.committedDateId.id ? tcd.committedDateId.id : nullDateId,
      actor: tfua?.userId.id ? tfua.userId.id : nullUserId,
      subject: tfus?.userId.id ? tfus.userId.id : nullUserId,
      repository: repositoryId,
      reviewState: 'unknown',
    } satisfies transform.NewMergeRequestEvent;
  })

  events.push(metricEvents.opened);
  events.push(metricEvents.startedCoding);
  events.push(metricEvents.startedPickup);
  events.push(metricEvents.startedReview);

  await deleteMergeRequestEvents(tx, mergeRequestId);
  console.log(events.length);
  if (events.length > 0) {
    await insertMergeRequestEvents(tx, events).run();
  }
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

  const timeline = runTimeline(extractData.mergeRequest, extractData.timelineEvents, extractData.notes);

  const timelineUsers = getUserData(extractData.timelineEvents, extractData.mergeRequest.authorExternalId as number);

  const transformUsersIds = await getTransformUserData(ctx.extractDatabase, ctx.transformDatabase, timelineUsers);

  const {
    dateId: nullDateId,
    userId: nullUserId,
    mergeRequestId: _nullMergeRequestId,
    repositoryId: _nullRepositoryId
  } = await selectNullRows(ctx.transformDatabase);


  const transformDates = await mapDatesToTransformedDates(ctx.transformDatabase, {
    openedAt: extractData.mergeRequest.openedAt,
    mergedAt: extractData.mergeRequest.mergedAt,
    closedAt: extractData.mergeRequest.closedAt,
    startedCodingAt: timeline.startedCodingAt,
    startedPickupAt: timeline.startedPickupAt,
    startedReviewAt: timeline.startedReviewAt,
    lastUpdatedAt: extractData.mergeRequest.updatedAt,
  }, nullDateId);

  const mrSize = calculateMrSize(extractMergeRequestId, extractData.diffs.filter(Boolean));

  const codingDuration = calculateDuration(timeline.startedCodingAt, timeline.startedPickupAt);
  const pickupDuration = calculateDuration(timeline.startedPickupAt, timeline.startedReviewAt);
  const reviewDuration = calculateDuration(timeline.startedReviewAt, extractData.mergeRequest.closedAt);

  const usersJunk = mapUsersToJunk({
    author: transformUsersIds.author,
    mergedBy: transformUsersIds.mergedBy,
    approvers: transformUsersIds.approvers,
    committers: transformUsersIds.committers,
    reviewers: transformUsersIds.reviewers,
  }, nullUserId);

  const { id: transformRepositoryId } = await upsertRepository(ctx.transformDatabase, extractData.repository).get();

  const { id: transformMergeRequestId } = await upsertMergeRequest(ctx.transformDatabase, {
    externalId: extractData.mergeRequest.externalId,
    forgeType: extractData.repository.forgeType,
    title: extractData.mergeRequest.title,
    webUrl: extractData.mergeRequest.webUrl,
  })
  .get();

  const metricData = {
    mrSize: mrSize || -1,
    codingDuration: codingDuration,
    pickupDuration: pickupDuration,
    reviewDuration: reviewDuration,
    handover: 0,
    reviewDepth: timeline.reviewDepth,
    merged: transformDates.mergedAt ? true : false,
    closed: transformDates.closedAt ? true : false,
    approved: timeline.approved,
    reviewed: timeline.approved,
  }
  const metricInfo = await selectMetricInfo(ctx.transformDatabase, transformMergeRequestId).get();


  const metricEvents = createMetricEvents(
    usersJunk.author,
    extractData.mergeRequest.openedAt,
    transformDates.openedAt.id,
    timeline.startedCodingAt,
    transformDates.startedCodingAt.id,
    timeline.startedPickupAt,
    transformDates.startedPickupAt.id,
    timeline.startedReviewAt,
    transformDates.startedReviewAt.id,
    transformRepositoryId,
    transformMergeRequestId,
    nullDateId,
    nullUserId,
  );


  if (metricInfo) {
    await ctx.transformDatabase.transaction(
      async (tx) => {
        await updateDateJunk(tx, {
          id: metricInfo.datesJunk,
          mergedAt: transformDates.mergedAt.id,
          closedAt: transformDates.closedAt.id,
          openedAt: transformDates.openedAt.id,
          startedCodingAt: transformDates.startedCodingAt.id,
          lastUpdatedAt: transformDates.lastUpdatedAt.id,
          startedPickupAt: transformDates.startedPickupAt.id,
          startedReviewAt: transformDates.startedReviewAt.id,
        }).run();

        await updateUserJunk(tx, {
          id: metricInfo.usersJunk,
          ...usersJunk
        }).run();

        await updateMergeMetrics(tx, {
          ...metricInfo,
          ...metricData,
          repository: transformRepositoryId,
          mergeRequest: transformMergeRequestId,
        }).run();

        await upsertMergeRequestEvents(
          tx,
          ctx.transformDatabase,
          transformRepositoryId,
          transformMergeRequestId,
          extractData.timelineEvents,
          nullDateId,
          nullUserId,
          metricEvents
        );
      }
    )
  } else {
    await ctx.transformDatabase.transaction(
      async (tx) => {
        const { id: dateJunkId } = await insertDateJunk(tx, {
          mergedAt: transformDates.mergedAt.id,
          closedAt: transformDates.closedAt.id,
          openedAt: transformDates.openedAt.id,
          startedCodingAt: transformDates.startedCodingAt.id,
          lastUpdatedAt: transformDates.lastUpdatedAt.id,
          startedPickupAt: transformDates.startedPickupAt.id,
          startedReviewAt: transformDates.startedReviewAt.id,
        }).get();

        const { id: userJunkId } = await insertUserJunk(tx, usersJunk).get();

        await insertMergeMetrics(tx, {
          ...metricData,
          usersJunk: userJunkId,
          datesJunk: dateJunkId,
          repository: transformRepositoryId,
          mergeRequest: transformMergeRequestId,
        }).run()

        await upsertMergeRequestEvents(
          tx,
          ctx.transformDatabase,
          transformRepositoryId,
          transformMergeRequestId,
          extractData.timelineEvents,
          nullDateId,
          nullUserId,
          metricEvents
        );
      }
    )
  }

}


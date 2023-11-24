import * as extract from '@acme/extract-schema';
import * as transform from '@acme/transform-schema';
import { sql, eq, or, and, type ExtractTablesWithRelations } from "drizzle-orm";
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import { isCodeGen } from './is-codegen';
import { parseHunks } from './parse-hunks';
import { type SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import { type ResultSet } from '@libsql/client/.';

type BrandedDatabase<T> = LibSQLDatabase<Record<string, unknown>> & { __brand: T }

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

function _upsertForgeUser(db: TransformDatabase, forgeUser: transform.NewForgeUser) {
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
  week: number,
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

function getWeek(date: Date): number {
  // Logic copied from dimensions.ts
  return Math.ceil(((+date - +new Date(date.getUTCFullYear(), 0, 1)) / (24 * 60 * 60 * 1000)) / 7);
}

async function mapDatesToTransformedDates(db: TransformDatabase, dates: mapDatesToTransformedDatesArgs, nullDateId: number) {

  function getDMY(date: Date | null) {
    if (date === null) {
      return null;
    }
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      week: getWeek(date),
    };
  }

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


async function selectDates(db: TransformDatabase, dates: selectDatesArgs, nullDateId: number) {

  const { dates: transformDates } = transform;


  function getDMYQuery(dmy: DMY | null) {
    if (dmy === null) {
      return undefined;
    }
    return and(
      eq(transformDates.year, dmy.year),
      eq(transformDates.month, dmy.month),
      eq(transformDates.day, dmy.day),
      eq(transformDates.week, dmy.week),
    );
  }

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

  function getDateIdOrNullDateId(dmy: DMY | null) {
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


  return {
    openedAt: getDateIdOrNullDateId(dates.openedAt),
    mergedAt: getDateIdOrNullDateId(dates.mergedAt),
    closedAt: getDateIdOrNullDateId(dates.closedAt),
    startedCodingAt: getDateIdOrNullDateId(dates.startedCodingAt),
    startedPickupAt: getDateIdOrNullDateId(dates.startedPickupAt),
    startedReviewAt: getDateIdOrNullDateId(dates.startedReviewAt),
    lastUpdatedAt: getDateIdOrNullDateId(dates.lastUpdatedAt),
  };
}

type MapUsersToJunksArgs = {
  author: transform.ForgeUser['id'] | null | undefined,
  mergedBy: transform.ForgeUser['id'] | null | undefined,
  approvers: transform.ForgeUser['id'][],
  committers: transform.ForgeUser['id'][],
  reviewers: transform.ForgeUser['id'][]
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
    console.error(new Error(`No extracted merge request diffs found for ids: ${mergeRequestId}`));
    return null;
  }

  let mrSize = 0;

  for (const diff of diffs) {


    const codeGenResult = isCodeGen(diff.newPath);

    if (codeGenResult === true) {
      console.error(new Error(`This file is part of codeGen: ${diff.newPath} on merge request with id: ${mergeRequestId}`));
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

type TimelineEventData = {
  type: extract.TimelineEvents['type'];
  timestamp: extract.TimelineEvents['timestamp'];
  actorId: extract.TimelineEvents['actorId'];
  data: extract.TimelineEvents['data'];
}

type MergeRequestNoteData = {
  createdAt: extract.MergeRequestNote['createdAt'];
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
    createdAt: mergeRequestNotes.createdAt,
    authorExternalId: mergeRequestNotes.authorExternalId,
  })
    .from(mergeRequestNotes)
    .where(eq(mergeRequestNotes.mergeRequestId, extractMergeRequestId))
    .all() satisfies MergeRequestNoteData[];

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
    notes: mergeRequestNotesData,
    timelineEvents: timelineEventsData,
    ...repositoryData || { repository: null },
  };
}

export type RunContext = {
  extractDatabase: ExtractDatabase;
  transformDatabase: TransformDatabase;
};

type TimelineMapKey = {
  type: extract.TimelineEvents['type'] | 'note',
  timestamp: Date,
  actorId: extract.TimelineEvents['actorId'] | extract.MergeRequestNote['authorExternalId'] | null,
}
function setupTimeline(timelineEvents: TimelineEventData[], notes: MergeRequestNoteData[]) {
  const timeline = new Map<TimelineMapKey,
    TimelineEventData | MergeRequestNoteData
  >();


  for (const timelineEvent of timelineEvents) {
    timeline.set({
      type: timelineEvent.type,
      timestamp: timelineEvent.timestamp,
      actorId: timelineEvent.actorId,
    }, timelineEvent);
  }

  for (const note of notes) {
    timeline.set({
      type: 'note',
      timestamp: note.createdAt,
      actorId: note.authorExternalId,
    }, note);
  }

  return timeline;

}

function runTimeline(extractMergeRequest: MergeRequestData, timelineEvents: TimelineEventData[], notes: MergeRequestNoteData[]) {

  const timelineMap = setupTimeline(timelineEvents, notes);
  const timelineMapKeys = [...timelineMap.keys()];

  //start coding at

  const committedEvents = timelineMapKeys.filter(({ type }) => type === 'committed') as (TimelineMapKey & { type: 'committed' })[];

  let startedCodingAt: Date | null = null;

  if (committedEvents.length > 0) {

    for (const committedEvent of committedEvents) {
      if (!startedCodingAt) {
        startedCodingAt = committedEvent.timestamp;
      }
      else if (committedEvent.timestamp.getTime() < startedCodingAt.getTime()) {
        startedCodingAt = committedEvent.timestamp;
      }
    }

  }

  // start review at

  const reviewEvents = timelineMapKeys.filter(({ type }) => type === 'note' || type === 'reviewed' || type === 'commented') as (TimelineMapKey & { type: 'note' | 'reviewed' | 'commented' })[];
  let startedReviewAt: Date | null = null;

  if (reviewEvents.length > 0) {
    for (const reviewEvent of reviewEvents) {
      if (!startedReviewAt && reviewEvent.actorId !== extractMergeRequest.authorExternalId) {
        startedReviewAt = reviewEvent.timestamp;
      }
      if (startedReviewAt && reviewEvent.timestamp.getTime() < startedReviewAt.getTime()) {
        startedReviewAt = reviewEvent.timestamp;
      }
    }
  }

  // start pickup at

  const convertToDraftEvents = timelineMapKeys.filter(({ type }) => type === 'convert_to_draft') as (TimelineMapKey & { type: 'convert_to_draft' })[];
  let lastConvertToDraftBeforeReview: Date | null = null;

  for (const convertToDraft of convertToDraftEvents) {
    if (
      (!lastConvertToDraftBeforeReview || convertToDraft.timestamp.getTime() > lastConvertToDraftBeforeReview.getTime())
      && (!startedReviewAt || convertToDraft.timestamp.getTime() < startedReviewAt.getTime())
    ) {
      lastConvertToDraftBeforeReview = convertToDraft.timestamp;
    }
  }

  let startedPickupAt: Date | null = null;
  const initialPickupEvents = timelineMapKeys.filter(({ type, timestamp }) => type === 'ready_for_review' || type === 'review_requested'
    && (!lastConvertToDraftBeforeReview || timestamp.getTime() > lastConvertToDraftBeforeReview.getTime())
    && (!startedReviewAt || timestamp.getTime() < startedReviewAt.getTime())) as (TimelineMapKey & { type: 'ready_for_review' | 'review_requested' })[];

  for (const pickupEvent of initialPickupEvents) {
    if (!startedPickupAt || pickupEvent.timestamp.getTime() < startedPickupAt.getTime()) {
      startedPickupAt = pickupEvent.timestamp;
    }
  }

  if (startedReviewAt && !startedPickupAt) {
    for (const committedEvent of committedEvents) {
      if (!startedPickupAt && committedEvent.timestamp.getTime() < startedReviewAt.getTime()) startedPickupAt = committedEvent.timestamp;
      if (startedPickupAt
        && committedEvent.timestamp.getTime() > startedPickupAt.getTime()
        && committedEvent.timestamp.getTime() < startedReviewAt.getTime()) startedPickupAt = committedEvent.timestamp;
    }
  }

  if (startedReviewAt && !startedPickupAt) {
    startedPickupAt = extractMergeRequest.openedAt;
  }

  // TODO: can this be optimized with the map ?
  const approved = timelineEvents.find(ev => ev.type === 'reviewed' && (JSON.parse(ev.data as string) as extract.ReviewedEvent).state === 'approved') !== undefined;

  return {
    startedCodingAt,
    startedReviewAt,
    startedPickupAt,
    reviewed: startedReviewAt !== null,
    approved,
    reviewDepth: reviewEvents.length,
  };
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
    author: (await ctx.transformDatabase.select().from(transform.forgeUsers).where(and(
      eq(transform.forgeUsers.externalId, extractData.mergeRequest.authorExternalId || 0),
      eq(transform.forgeUsers.forgeType, extractData.repository.forgeType),
    )).get())?.id || null, // TODO: ???
    mergedBy: null,
    approvers: [],
    committers: [],
    reviewers: [],
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
      }
    )
  }

}


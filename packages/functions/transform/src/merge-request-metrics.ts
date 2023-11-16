import * as extract from '@acme/extract-schema';
import * as transform from '@acme/transform-schema';
import { sql, eq, or, and } from "drizzle-orm";
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import { isCodeGen } from './is-codegen';
import { parseHunks } from './parse-hunks';

type BrandedDatabase<T> = LibSQLDatabase<Record<string, unknown>> & { __brand: T }

export type TransformDatabase = BrandedDatabase<'transform'>;
export type ExtractDatabase = BrandedDatabase<'extract'>;

function _insertMergeMetrics(_db: TransformDatabase, _mergeMetrics: transform.NewMergeRequestMetric): any {
  throw new Error('Not implemented');
}

function _upsertRepository(db: TransformDatabase, repo: transform.NewRepository) {
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
    });
}

function _upsertMergeRequest(db: TransformDatabase, mergeRequest: transform.NewMergeRequest) {
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

function _insertUserJunk(_db: TransformDatabase, _users: any): any {
  throw new Error('Not implemented');
}

function _updateUserJunk(_db: TransformDatabase, _users: any): any {
  throw new Error('Not implemented');
}

function _insertDateJunk(_db: TransformDatabase, _dates: any): any {
  throw new Error('Not implemented');
}

function _updateDateJunk(_db: TransformDatabase, _dates: any): any {
  throw new Error('Not implemented');
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
  };
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

type MergeRequestData = {
  openedAt: extract.MergeRequest['createdAt'],
  mergedAt: extract.MergeRequest['mergedAt'],
  closedAt: extract.MergeRequest['closedAt'],
  externalId: extract.MergeRequest['externalId'],
  authorExternalId: extract.MergeRequest['authorExternalId']
}
async function selectExtractData(db: ExtractDatabase, extractMergeRequestId: number) {
  const { mergeRequests, mergeRequestDiffs, mergeRequestNotes, timelineEvents } = extract;

  const mergeRequestData = await db.select({
    mergeRequest: {
      openedAt: mergeRequests.createdAt,
      mergedAt: mergeRequests.mergedAt,
      closedAt: mergeRequests.closedAt,
      externalId: mergeRequests.externalId,
      authorExternalId: mergeRequests.authorExternalId,
    }
  }).from(mergeRequests)
    .where(eq(mergeRequests.id, extractMergeRequestId))
    .get();

  const mergerRequestDiffsData = await db.select({
    stringifiedHunks: mergeRequestDiffs.diff,
    newPath: mergeRequestDiffs.newPath,
  })
    .from(mergeRequests)
    .where(eq(mergeRequestDiffs.mergeRequestId, extractMergeRequestId))
    .all();

  const mergeRequestNotesData = await db.select() // specify columns
    .from(mergeRequestNotes)
    .where(eq(mergeRequestNotes.mergeRequestId, extractMergeRequestId))
    .all();

  const timelineEventsData = await db.select() // specify columns
    .from(timelineEvents)
    .where(eq(timelineEvents.mergeRequestId, extractMergeRequestId))
    .all();

  return {
    diffs: mergerRequestDiffsData,
    ...mergeRequestData || { mergeRequest: null },
    notes: mergeRequestNotesData,
    timelineEvents: timelineEventsData,
  };
}

export type RunContext = {
  extractDatabase: ExtractDatabase;
  transformDatabase: TransformDatabase;
};

/*
function getTimelineReviewDepth(reviewComments: extract.MergeRequestNote[], timeline: extract.TimelineEvents[]) {
  // TODO: review depth should be avg of conversation length ??? Not sure if a PR has only one review or we count individual reviews/threads
  const numberOfReviewComments = reviewComments.length;
  const numberOfReviewsOrComments = timeline.filter(event => event.type === 'reviewed' || event.type === 'commented').length;
  return numberOfReviewComments + numberOfReviewsOrComments;
}

function getTimelineApproved(timeline: extract.TimelineEvents[]) {
  const { ReviewedEventSchema } = extract;

  const reviewedEvent = timeline.find((event) => {
    if (event.type !== 'reviewed') {
      return false;
    }

    const { state } = ReviewedEventSchema.parse(event.data as string);

    return state === 'approved';
  });

  return reviewedEvent || null;
}

function getTimelineReviewed(timeline: extract.TimelineEvents[]) {
  return !!timeline.find(event => event.type === 'reviewed'); // TODO: event.type === 'commented' ?
}

function getTimelineStartedCodingAt(timeline: extract.TimelineEvents[]) {

  const firstCommit = timeline.reduce<extract.TimelineEvents | null>(
    (commit, event) =>
      event.type === 'committed' && (commit === null || event.timestamp.getTime() < commit.timestamp.getTime()) ? event : commit
    , null
  );

  return firstCommit?.timestamp || null;
}
*/

type TimelineMapKey = {
  type: extract.TimelineEvents['type'] | 'note',
  timestamp: Date,
  actorId: extract.TimelineEvents['actorId'] | extract.MergeRequestNote['authorExternalId'] | null,
}
function setupTimeline(timelineEvents: extract.TimelineEvents[], notes: extract.MergeRequestNote[]) {
  const timeline = new Map<TimelineMapKey,
    extract.TimelineEvents | extract.MergeRequestNote
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

function runTimeline(extractMergeRequest: MergeRequestData, timelineEvents: extract.TimelineEvents[], notes: extract.MergeRequestNote[]) {

  const timelineMap = setupTimeline(timelineEvents, notes);
  const timelineMapKeys = [...timelineMap.keys()];

  //start coding at

  const commitedEvents = timelineMapKeys.filter(({ type }) => type === 'committed') as (TimelineMapKey & { type: 'committed' })[];

  let startedCodingAt: Date | null = null;

  if (commitedEvents.length > 0) {

    for (const commitedEvent of commitedEvents) {
      if (!startedCodingAt) {
        startedCodingAt = commitedEvent.timestamp;
      } 
      else if (commitedEvent.timestamp.getTime() < startedCodingAt.getTime()) {
        startedCodingAt = commitedEvent.timestamp;
      }
    }

  }

  // start review at

  const reviewEvents = timelineMapKeys.filter(({ type }) => type === 'note' || type === 'reviewed' || type === 'commented') as (TimelineMapKey & { type: 'note' | 'reviewed' | 'commented'})[];
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

  let startedPickupAt: Date | null = null;
  const pickupEventsBeforeReview = timelineMapKeys.filter(({ type, timestamp }) => type === 'ready_for_review' || type === 'review_requested' || type === 'convert_to_draft'
    && (!startedReviewAt || timestamp.getTime() < startedReviewAt.getTime())) as (TimelineMapKey & { type: 'ready_for_review' | 'review_requested' | 'convert_to_draft' })[];

  if (pickupEventsBeforeReview.length > 0) {
    for (const pickupEvent of pickupEventsBeforeReview) {
      if (pickupEvent.type === 'convert_to_draft') {
        startedPickupAt = null;
      } else if (!startedPickupAt) { 
        startedPickupAt = pickupEvent.timestamp;
      } else if (pickupEvent.timestamp.getTime() < startedPickupAt.getTime()) {
        startedPickupAt = pickupEvent.timestamp;
      }
    }
  }

  if (startedReviewAt && !startedPickupAt && commitedEvents.length > 0) {
    for(const commitedEvent of commitedEvents) {
      if (!startedPickupAt && commitedEvent.timestamp.getTime() < startedReviewAt.getTime()) startedPickupAt = commitedEvent.timestamp;
      if (startedPickupAt && commitedEvent.timestamp.getTime() < startedPickupAt.getTime()) startedPickupAt = commitedEvent.timestamp;
    }
  }

  if (startedReviewAt && !startedPickupAt) {
    startedPickupAt = extractMergeRequest.openedAt; // if no commits before first review, set it to openedAt. Should only happen if there is a wierd force push
  }

  return {
    startedCodingAt,
    startedReviewAt,
    startedPickupAt,
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

  const timeline = runTimeline(extractData.mergeRequest, extractData.timelineEvents, extractData.notes);

  const {
    dateId: nullDateId,
    userId: _nullUserId,
    mergeRequestId: _nullMergeRequestId,
    repositoryId: _nullRepositoryId
  } = await selectNullRows(ctx.transformDatabase);


  const _transformDates = await mapDatesToTransformedDates(ctx.transformDatabase, {
    openedAt: extractData.mergeRequest.openedAt,
    mergedAt: extractData.mergeRequest.mergedAt,
    closedAt: extractData.mergeRequest.closedAt,
    startedCodingAt: timeline.startedCodingAt,
  }, nullDateId);

  const _mrSize = calculateMrSize(extractMergeRequestId, extractData.diffs.filter(Boolean));

  /*
  insertMergeMetrics(ctx.transformDatabase, {
    mrSize: mrSize || -1,
  });
  */

}


import type { TransformFunction, ExtractEntities, TransformEntities } from "./config";
import { and, eq, sql } from "drizzle-orm";
import type { NewMergeRequest } from "@acme/extract-schema";

export type SetMergeRequestMetricsInput = {
  extractMergeRequestIds: NewMergeRequest["id"][];
}
export type SetMergeRequestMetricsOutput = void;
export type SetMergeRequestMetricsExtractEntities = Pick<ExtractEntities, 'repositories' | 'mergeRequests'>;
export type SetMergeRequestMetricsTransformEntities = Pick<TransformEntities, 'mergeRequestMetrics' | 'dates' | 'mergeRequestDatesJunk'>;

export type SetMergeRequestMetricsFunction = TransformFunction<SetMergeRequestMetricsInput, SetMergeRequestMetricsOutput, SetMergeRequestMetricsExtractEntities, SetMergeRequestMetricsTransformEntities>;

export const setMergeRequestMetrics: SetMergeRequestMetricsFunction = async (
  { extractMergeRequestIds }, 
  { extract, transform }
) => {

  const transformedMergeRequests = await extract.db.select({
    openedAt: extract.entities.mergeRequests.createdAt,
    mergedAt: extract.entities.mergeRequests.mergedAt,
    closedAt: extract.entities.mergeRequests.closedAt,
    mergeRequestId: extract.entities.mergeRequests.canonId,
  }).from(extract.entities.mergeRequests)
    .innerJoin(extract.entities.repositories, eq(extract.entities.mergeRequests.repositoryId, extract.entities.repositories.id))
    .all();
  
  const dateJunks = await Promise.all(transformedMergeRequests.map(async (mergeRequest) => {
    let datesJunk = {
      mergedAt: 0,
      closedAt: 0,
      openedAt: 0,
      lastUpdatedAt: 0,
      startedCodingAt: 0,
      startedPickupAt: 0,
      startedReviewAt: 0,
    };
    if (mergeRequest.mergedAt) {
      const mergedAtId = await transform.db.select({
        id: transform.entities.dates.id,
      }).from(transform.entities.dates)
        .where(and(
          eq(transform.entities.dates.year, mergeRequest.mergedAt.getFullYear()), 
          eq(transform.entities.dates.month, mergeRequest.mergedAt.getMonth() + 1), 
          eq(transform.entities.dates.day, mergeRequest.mergedAt.getDate())
        ));
      datesJunk = { ...datesJunk, mergedAt: mergedAtId[0]?.id ? mergedAtId[0]?.id : 0};
    }
    if (mergeRequest.closedAt) {
      const closedAtId = await transform.db.select({
        id: transform.entities.dates.id,
      }).from(transform.entities.dates)
        .where(and(
          eq(transform.entities.dates.year, mergeRequest.closedAt.getFullYear()), 
          eq(transform.entities.dates.month, mergeRequest.closedAt.getMonth() + 1),  
          eq(transform.entities.dates.day, mergeRequest.closedAt.getDate())
        ));
      datesJunk = { ...datesJunk, closedAt: closedAtId[0]?.id ? closedAtId[0]?.id : 0};
    }
    if (mergeRequest.openedAt) {
      const openedAtId = await transform.db.select({
        id: transform.entities.dates.id,
      }).from(transform.entities.dates)
        .where(and(
          eq(transform.entities.dates.year, mergeRequest.openedAt.getFullYear()), 
          eq(transform.entities.dates.month, mergeRequest.openedAt.getMonth() + 1),  
          eq(transform.entities.dates.day, mergeRequest.openedAt.getDate())
        ));
        datesJunk = { ...datesJunk, openedAt: openedAtId[0]?.id ? openedAtId[0]?.id : 0};
    }
    return datesJunk;
  }));
  
  if (transformedMergeRequests.length === 0) {
    console.error(new Error(`No extracted merge request found for ids: ${extractMergeRequestIds}`));
    return;
  }

  if (dateJunks) {
      console.log('DJ: ', dateJunks);
      try {
        dateJunks.map(dateJunk =>
          transform.db.insert(transform.entities.mergeRequestDatesJunk)
          .values(dateJunk)
          .onConflictDoUpdate({
            target: [transform.entities.mergeRequestDatesJunk.mergedAt, transform.entities.mergeRequestDatesJunk.openedAt, transform.entities.mergeRequestDatesJunk.closedAt],
            set: {
              mergedAt: dateJunk.mergedAt,
              openedAt: dateJunk.openedAt,
              closedAt: dateJunk.closedAt,
              _updatedAt: sql`(strftime('%s', 'now'))`,
            }
          })
        )
      } catch (error) {
        console.log('ERROR', error);
      }
      
    }

  // const queries = transformedMergeRequests.map(
  //   mergeRequest => transform.db.insert(transform.entities.mergeRequestMetrics)
  //     .values(mergeRequest)
  //     .onConflictDoUpdate({
  //       target: [transform.entities.mergeRequestMetrics.mergeRequest], 
  //       set: {
  //         merged: mergeRequest.mergedAt ? true : false,
  //         closed: mergeRequest.closedAt ? true : false,
  //         _updatedAt: sql`(strftime('%s', 'now'))`,
  //       }
  //     })
  // );

  // type Query = typeof queries[number];
  
  // await transform.db.batch(
  //   queries as [Query, ...Query[]]
  // );
}
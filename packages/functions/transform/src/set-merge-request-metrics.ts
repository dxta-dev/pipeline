import type { TransformFunction, ExtractEntities, TransformEntities } from "./config";
import { and, eq, inArray } from "drizzle-orm";
import type { MergeRequest } from "@acme/extract-schema";

export type SetMergeRequestMetricsInput = {
  extractMergeRequestIds: MergeRequest["id"][];
}
export type SetMergeRequestMetricsOutput = void;
export type SetMergeRequestMetricsExtractEntities = Pick<ExtractEntities, 'repositories' | 'mergeRequests'>;
export type SetMergeRequestMetricsTransformEntities = Pick<TransformEntities, 'mergeRequestMetrics' | 'dates' | 'mergeRequestDatesJunk'>;

export type SetMergeRequestMetricsFunction = TransformFunction<SetMergeRequestMetricsInput, SetMergeRequestMetricsOutput, SetMergeRequestMetricsExtractEntities, SetMergeRequestMetricsTransformEntities>;

export const setMergeRequestMetrics: SetMergeRequestMetricsFunction = async (
  { extractMergeRequestIds }, 
  { extract, transform }
) => {

  const extractMergeRequests = await extract.db.select({
    openedAt: extract.entities.mergeRequests.createdAt,
    mergedAt: extract.entities.mergeRequests.mergedAt,
    closedAt: extract.entities.mergeRequests.closedAt,
    externalId: extract.entities.mergeRequests.externalId,
  }).from(extract.entities.mergeRequests)
    .where(inArray(extract.entities.mergeRequests.id, extractMergeRequestIds))
    .all();
  
  const dateJunks = await Promise.all(extractMergeRequests.map(async (mergeRequest) => {
    let datesJunk = {
      mergedAt: 1,
      closedAt: 1,
      openedAt: 1,
      lastUpdatedAt: 1,
      startedCodingAt: 1,
      startedPickupAt: 1,
      startedReviewAt: 1,
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
      datesJunk = { ...datesJunk, mergedAt: mergedAtId[0]?.id ? mergedAtId[0]?.id : 1};
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
      datesJunk = { ...datesJunk, closedAt: closedAtId[0]?.id ? closedAtId[0]?.id : 1};
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
        datesJunk = { ...datesJunk, openedAt: openedAtId[0]?.id ? openedAtId[0]?.id : 1};
    }
    return datesJunk;
  }));
  
  if (extractMergeRequests.length === 0) {
    console.error(new Error(`No extracted merge request found for ids: ${extractMergeRequestIds}`));
    return;
  }

  if (dateJunks) {
      try {
        const queries = dateJunks.map(dateJunk =>
            transform.db.insert(transform.entities.mergeRequestDatesJunk)
            .values(dateJunk)
        );
        type Query = typeof queries[number];
        
        await transform.db.batch(
          queries as [Query, ...Query[]]
        );
      } catch (error) {
        console.log('ERROR', error);
      }
    }

  // const queries = extractMergeRequests.map(
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

}
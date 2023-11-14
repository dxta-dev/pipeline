import type { TransformFunction, ExtractEntities, TransformEntities } from "./config";
import { and, eq, sql } from "drizzle-orm";
import type { MergeRequest } from "@acme/extract-schema";

export type SetMergeRequestMetricsInput = {
  extractMergeRequestId: MergeRequest["id"];
}
export type SetMergeRequestMetricsOutput = void;
export type SetMergeRequestMetricsExtractEntities = Pick<ExtractEntities, 'repositories' | 'mergeRequests'>;
export type SetMergeRequestMetricsTransformEntities = Pick<TransformEntities, 'mergeRequestMetrics' | 'dates' | 'mergeRequestDatesJunk' | 'mergeRequests'>;

export type SetMergeRequestMetricsFunction = TransformFunction<SetMergeRequestMetricsInput, SetMergeRequestMetricsOutput, SetMergeRequestMetricsExtractEntities, SetMergeRequestMetricsTransformEntities>;

export const setMergeRequestMetrics: SetMergeRequestMetricsFunction = async (
  { extractMergeRequestId }, 
  { extract, transform }
) => {

  const extractMergeRequest = await extract.db.select({
    openedAt: extract.entities.mergeRequests.createdAt,
    mergedAt: extract.entities.mergeRequests.mergedAt,
    closedAt: extract.entities.mergeRequests.closedAt,
    externalId: extract.entities.mergeRequests.externalId,
  }).from(extract.entities.mergeRequests)
    .where(eq(extract.entities.mergeRequests.id, extractMergeRequestId))
    .get();
  
  if (!extractMergeRequest) {
    console.error(`No extracted merge request found for id: ${extractMergeRequestId}`);
    return;
  }
  
  let dateJunk = {
    mergedAt: 1,
    closedAt: 1,
    openedAt: 1,
    lastUpdatedAt: 1,
    startedCodingAt: 1,
    startedPickupAt: 1,
    startedReviewAt: 1,
  };

  if (extractMergeRequest.mergedAt) {
    const mergedAtId = await transform.db.select({
      id: transform.entities.dates.id,
    }).from(transform.entities.dates)
    .where(and(
      eq(transform.entities.dates.year, extractMergeRequest.mergedAt.getFullYear()), 
      eq(transform.entities.dates.month, extractMergeRequest.mergedAt.getMonth() + 1), 
      eq(transform.entities.dates.day, extractMergeRequest.mergedAt.getDate())
    ));
    dateJunk = {...dateJunk, mergedAt: mergedAtId[0]?.id as number}
  }

  if (extractMergeRequest.closedAt) {
    const closedAtId = await transform.db.select({
      id: transform.entities.dates.id,
    }).from(transform.entities.dates)
    .where(and(
      eq(transform.entities.dates.year, extractMergeRequest.closedAt.getFullYear()),
      eq(transform.entities.dates.month, extractMergeRequest.closedAt.getMonth() + 1),
      eq(transform.entities.dates.day, extractMergeRequest.closedAt.getDate())
    ));
    dateJunk = {...dateJunk, closedAt: closedAtId[0]?.id as number}
  }

  if (extractMergeRequest.openedAt) {
    const openedAtId = await transform.db.select({
      id: transform.entities.dates.id,
    }).from(transform.entities.dates)
    .where(and(
      eq(transform.entities.dates.year, extractMergeRequest.openedAt.getFullYear()), 
      eq(transform.entities.dates.month, extractMergeRequest.openedAt.getMonth() + 1),  
      eq(transform.entities.dates.day, extractMergeRequest.openedAt.getDate())
    ));
    dateJunk = {...dateJunk, openedAt: openedAtId[0]?.id as number}
  }
  
  const returningData = await transform.db.insert(transform.entities.mergeRequestDatesJunk)
  .values(dateJunk)
  .returning();

  const transformMergeRequestId = await transform.db.select({
    id: transform.entities.mergeRequests.id,
  }).from(transform.entities.mergeRequests)
  .where(
    eq(transform.entities.mergeRequests.externalId, extractMergeRequest.externalId)
  )
  .get();
  
  if (!transformMergeRequestId || !returningData[0]) {
    console.error(`No ids found for extractMergeRequests`);
    return;
  }
  
  const metricData = {
    merged: extractMergeRequest.mergedAt ? true : false,
    closed: extractMergeRequest.closedAt ? true : false,
    datesJunk: returningData[0].id,
    mergeRequest: transformMergeRequestId.id,
    //----TEST DATA----
    usersJunk: 1,
    repository: 1,
    mrSize: 1,
    codingDuration: 1,
    pickupDuration: 1,
    reviewDuration: 1,
    handover: 1,
    reviewDepth: 1,
    approved: false,
    reviewed: false,
    //----TEST DATA----
  };
  
  await transform.db.insert(transform.entities.mergeRequestMetrics)
    .values(metricData)
    .onConflictDoUpdate({
      target: [transform.entities.mergeRequestMetrics.mergeRequest], 
      set: {
        merged: metricData.merged,
        closed: metricData.closed,
        datesJunk: metricData.datesJunk,
        _updatedAt: sql`(strftime('%s', 'now'))`,
      }
  });
}
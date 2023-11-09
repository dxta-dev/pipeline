import type { TransformFunction, ExtractEntities, TransformEntities } from "./config";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { MergeRequest } from "@acme/extract-schema";

export type SetMergeRequestMetricsInput = {
  extractMergeRequestIds: MergeRequest["id"][];
}
export type SetMergeRequestMetricsOutput = void;
export type SetMergeRequestMetricsExtractEntities = Pick<ExtractEntities, 'repositories' | 'mergeRequests'>;
export type SetMergeRequestMetricsTransformEntities = Pick<TransformEntities, 'mergeRequestMetrics' | 'dates' | 'mergeRequestDatesJunk' | 'mergeRequests'>;

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

  const transformMergeRequestIds = await Promise.all(extractMergeRequests.map(async (mergeRequest) => {
    const mergeRequestId = await transform.db.select({
      id: transform.entities.mergeRequests.id,
    }).from(transform.entities.mergeRequests)
      .where(and(
        eq(transform.entities.mergeRequests.externalId, mergeRequest.externalId),
        eq(transform.entities.mergeRequests.forgeType, "github")
      ));
    return mergeRequestId[0]?.id;
  }))
  
  if (extractMergeRequests.length === 0) {
    console.error(new Error(`No extracted merge request found for ids: ${extractMergeRequestIds}`));
    return;
  }
  
  if (dateJunks.length === 0) {
    console.error(new Error(`No date junks found for extractMergeRequests`));
    return;
  }
  
  if (transformMergeRequestIds.length === 0) {
    console.error(new Error(`No ids found for extractMergeRequests`));
    return;
  }
  
  const returningData = await transform.db.insert(transform.entities.mergeRequestDatesJunk)
  .values(dateJunks)
  .returning();
  
  const metricData = extractMergeRequests.map((mergeRequest, index) => {
    const data = {
      merged: mergeRequest.mergedAt ? true : false,
      closed: mergeRequest.closedAt ? true : false,
      datesJunk: 1,
      mergeRequest: 1,
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
    return { ...data, datesJunk: returningData[index]?.id ?? 1, mergeRequest: transformMergeRequestIds[index] ?? 1 };
  });
  

  const queries = metricData.map(
    (metric) => transform.db.insert(transform.entities.mergeRequestMetrics)
      .values(metric)
      .onConflictDoUpdate({
        target: [transform.entities.mergeRequestMetrics.mergeRequest], 
        set: {
          merged: metric.merged,
          closed: metric.closed,
          datesJunk: metric.datesJunk,
          _updatedAt: sql`(strftime('%s', 'now'))`,
        }
      })
  );
  
  type Query = typeof queries[number];
  
  await transform.db.batch(
    queries as [Query, ...Query[]]
  );
}
import { eq, and } from "drizzle-orm";
import type { ExtractEntities, TransformEntities, TransformFunction } from "./config";
import type { CommittedEvent, MergeRequest as ExtractMergeRequest, ReviewedEvent } from "@acme/extract-schema";
import type { MergeRequestDatesJunk, NewMergeRequestMetric, TransformDate } from "@acme/transform-schema";

export type SetTimelineEventsInput = {
  mergeRequestId: ExtractMergeRequest["id"];
}
export type SetTimelineEventsOutput = void;
export type SetTimelineEventsExtractEntities = Pick<ExtractEntities, 'repositories' | 'mergeRequests' | 'timelineEvents' | 'mergeRequestNotes'>;
export type SetTimelineEventsTransformEntities = Pick<TransformEntities, 'repositories' | 'mergeRequests' | 'mergeRequestMetrics' | 'dates' | 'mergeRequestDatesJunk'>;

export type SetTimelineEventsFunction = TransformFunction<SetTimelineEventsInput, SetTimelineEventsOutput, SetTimelineEventsExtractEntities, SetTimelineEventsTransformEntities>;

const MS_IN_MINUTE = 60 * 1000;

export const setTimelineEvents: SetTimelineEventsFunction = async (
  { mergeRequestId },
  { extract, transform }
) => {
  let firstReviewCommentAt: Date | null = null;
  let reviewDepth = 0;
  let reviewed = false;
  let approved = false;

  // TODO: inner join mr and repo ?
  const mergeRequest = await extract.db.select({
    repositoryId: extract.entities.mergeRequests.repositoryId,
    externalId: extract.entities.mergeRequestNotes.externalId,
  })
    .from(extract.entities.mergeRequests)
    .where(eq(extract.entities.mergeRequests.id, mergeRequestId))
    .get();
  if (!mergeRequest) throw new Error(`Invalid namespace: ${mergeRequestId}`);

  const repository = await extract.db.select({
    externalId: extract.entities.repositories.externalId,
    forgeType: extract.entities.repositories.forgeType
  }).from(extract.entities.repositories)
    .where(eq(extract.entities.repositories.id, mergeRequest.repositoryId))
    .get();
  if (!repository) throw new Error(`Invalid repository: ${mergeRequest.repositoryId}`);

  const transformRepository = await transform.db.select({
    id: transform.entities.repositories.id
  })
    .from(transform.entities.repositories)
    .where(and(
      eq(transform.entities.repositories.externalId, repository.externalId),
      eq(transform.entities.repositories.forgeType, repository.forgeType),
    ))
    .get();
  if (!transformRepository) throw new Error(`Repository not yet transformed: ${mergeRequest.repositoryId}`);

  // Note: can't join transformed repo with merge request like in extract (no reference column)
  const transformMergeRequest = await transform.db.select({
    id: transform.entities.mergeRequests.id
  })
    .from(transform.entities.mergeRequests)
    .where(and(
      eq(transform.entities.mergeRequests.externalId, mergeRequest.externalId),
      eq(transform.entities.mergeRequests.forgeType, repository.forgeType),
    ))
    .get();
  if (!transformMergeRequest) throw new Error(`Merge Request not yet transformed: ${mergeRequestId}`);

  // TODO: Instead of this we could query count and select lowest createdAt. This could change if we authors for handovers
  const reviewComments = await extract.db.select()
    .from(extract.entities.mergeRequestNotes)
    .where(eq(extract.entities.mergeRequestNotes.mergeRequestId, mergeRequestId))
    .all();

  for (const reviewComment of reviewComments) {
    if (firstReviewCommentAt === null) firstReviewCommentAt = reviewComment.createdAt;
    else if (reviewComment.createdAt < firstReviewCommentAt) firstReviewCommentAt = reviewComment.createdAt;
    reviewDepth++;
  }

  let firstCommitAt: Date | null = null;
  let firstReviewOrCommentAt: Date | null = null;
  let firstReviewRequestAt: Date | null = null;
  let firstReadyForReviewAt: Date | null = null;
  let closedAt: Date | null = null;

  let lastCommitBeforeFirstReviewAt: Date | null = null;
  let lastCommitBeforeFirstReviewCommentAt: Date | null = null;

  const timeline = await extract.db.select()
    .from(extract.entities.timelineEvents)
    .where(eq(extract.entities.timelineEvents.mergeRequestId, mergeRequestId))
    .all();

  timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  for (const event of timeline) {
    switch (event.type) {
      case 'committed':
        const commitTimestamp = (event.data as CommittedEvent).committedDate;
        if (firstCommitAt === null) firstCommitAt = commitTimestamp;
        if (firstReviewOrCommentAt === null) lastCommitBeforeFirstReviewAt = commitTimestamp; // Note: What if first review is before first commit ?
        if (firstReviewCommentAt !== null && event.timestamp < firstReviewCommentAt) lastCommitBeforeFirstReviewCommentAt = commitTimestamp;
        break;
      case 'reviewed':
        const reviewedEvent = event.data as ReviewedEvent;
        reviewed = true; // TODO: is a comment a review ? I'm so confused now
        if (reviewedEvent.state === 'approved') approved = true;
      case 'commented':
        if (firstReviewOrCommentAt === null) firstReviewOrCommentAt = event.timestamp;
        reviewDepth++; // Note: should we count reviewed events without body ? (Investigate how other solutions handle this)
        break;
      case 'review_requested':
        if (firstReviewRequestAt === null) firstReviewRequestAt = event.timestamp;
        break;
      case 'ready_for_review':
        if (firstReadyForReviewAt === null) firstReadyForReviewAt = event.timestamp;
        break;
      case 'closed':
        if (closedAt === null) closedAt = event.timestamp; // Note: What if a PR is reopened ? Can a merged PR be reopened?
        break;
      default:
        break;
    }
  }

  // TODO: what if no first commit ? Shouldn't happen in GitHub. What happens if force push base ref to PR branch ?
  const startedCodingAt: Date | null = firstCommitAt;
  let finishedCodingAt: Date | null = lastCommitBeforeFirstReviewAt || lastCommitBeforeFirstReviewCommentAt;
  let startedPickupAt: Date | null = null;
  let startedReviewAt: Date | null = firstReviewOrCommentAt || firstReviewCommentAt;

  if (lastCommitBeforeFirstReviewAt !== null && lastCommitBeforeFirstReviewCommentAt !== null
    && lastCommitBeforeFirstReviewAt < lastCommitBeforeFirstReviewCommentAt) finishedCodingAt = lastCommitBeforeFirstReviewAt;
  // Note: finishedCodingAt will be null ONLY if there is a review/comment BEFORE the first commit.

  if (firstReviewOrCommentAt !== null && firstReviewCommentAt !== null
    && firstReviewCommentAt < firstReviewOrCommentAt) startedReviewAt = firstReviewCommentAt;

  /**
   * Pickup starts when:
   * 1. A merge request is ready for review (*)
   * 2. A team member is requested to review the merge request
   * 3. The last commit before the first review
   * 
   * (*) - Note: This is not specified in any document, I think we should discuss it further. I think this depends on handover definitions and how a pickup is a handover ? (first handover ?)
   * (*) ... Cody keeps suggesting "// TODO: set handover junk" because of the above comment
   */
  if (firstReadyForReviewAt !== null) startedPickupAt = firstReadyForReviewAt;
  else if (firstReviewRequestAt !== null) startedPickupAt = firstReviewRequestAt;
  else if (startedReviewAt !== null)
    startedPickupAt = finishedCodingAt;
  // Note: startedPickupAt will be null ONLY if there is a review/comment before the first commit.

  if (startedPickupAt === null && startedReviewAt !== null) console.warn("Warning: Review started without pickup for MR", mergeRequestId);

  const selectNullDateQuery = transform.db.select()
    .from(transform.entities.dates)
    .where(eq(transform.entities.dates.id, 1)); // TODO: no magic numbers ?

  type TransformDateWithId = Pick<TransformDate, 'id'>;

  const [[startedCodingAtDate], [startedPickupAtDate], [startedReviewAtDate]] = await (transform.db.batch([
    startedCodingAt ? transform.db.select({
      id: transform.entities.dates.id
    })
      .from(transform.entities.dates)
      .where(and(
        eq(transform.entities.dates.day, startedCodingAt.getUTCDate()),
        // TODO: week ??
        eq(transform.entities.dates.month, startedCodingAt.getUTCMonth()),
        eq(transform.entities.dates.year, startedCodingAt.getUTCFullYear()),
      )) : selectNullDateQuery,
    startedPickupAt ? transform.db.select({
      id: transform.entities.dates.id
    })
      .from(transform.entities.dates)
      .where(and(
        eq(transform.entities.dates.day, startedPickupAt.getUTCDate()),
        // TODO: week ??
        eq(transform.entities.dates.month, startedPickupAt.getUTCMonth()),
        eq(transform.entities.dates.year, startedPickupAt.getUTCFullYear()),
      )) : selectNullDateQuery,
    startedReviewAt ? transform.db.select({
      id: transform.entities.dates.id
    })
      .from(transform.entities.dates)
      .where(and(
        eq(transform.entities.dates.day, startedReviewAt.getUTCDate()),
        // TODO: week ??
        eq(transform.entities.dates.month, startedReviewAt.getUTCMonth()),
        eq(transform.entities.dates.year, startedReviewAt.getUTCFullYear()),
      )) : selectNullDateQuery
  ]) as unknown as Promise<[[TransformDateWithId | undefined], [TransformDateWithId | undefined], [TransformDateWithId | undefined]]>);

  const newDatesJunkDates = {
    startedCodingAt: startedCodingAtDate?.id || 1, // TODO: no magic numbers ?
    startedPickupAt: startedPickupAtDate?.id || 1, // TODO: no magic numbers ?
    startedReviewAt: startedReviewAtDate?.id || 1, // TODO: no magic numbers ?    
  } satisfies Partial<MergeRequestDatesJunk>;

  const existingPRMetrics = await transform.db.select({
    datesJunk: transform.entities.mergeRequestMetrics.datesJunk,
  })
    .from(transform.entities.mergeRequestMetrics)
    .where(eq(transform.entities.mergeRequestMetrics.mergeRequest, transformMergeRequest.id))
    .get();

  let datesJunkId = existingPRMetrics?.datesJunk || 1; // TODO: no magic numbers ?

  // If we find existing pr metrics, and the date junk id is not null, we want to update the date junk. Otherwise create a new date junk
  if (existingPRMetrics !== undefined && existingPRMetrics.datesJunk !== 1) {
    await transform.db.update(transform.entities.mergeRequestDatesJunk)
      .set(newDatesJunkDates)
      .where(eq(transform.entities.dates.id, existingPRMetrics.datesJunk))
      .run();
  } else {
    const insertedDatesJunk = await transform.db.insert(transform.entities.mergeRequestDatesJunk)
      .values({
        closedAt: 1, // TODO: no magic numbers ?
        mergedAt: 1, // TODO: no magic numbers ?
        openedAt: 1, // TODO: no magic numbers ?
        lastUpdatedAt: 1, // TODO: no magic numbers ?
        ...newDatesJunkDates
      })
      .returning().get();
    datesJunkId = insertedDatesJunk.id;
  }

  const now = new Date();
  let codingDuration = 0;
  let pickupDuration = 0;
  let reviewDuration = 0;
  if (startedCodingAt !== null) codingDuration = ((startedPickupAt || now).getTime() - startedCodingAt.getTime()) / MS_IN_MINUTE;
  if (startedPickupAt !== null) pickupDuration = ((startedReviewAt || now).getTime() - startedPickupAt.getTime()) / MS_IN_MINUTE;
  if (startedReviewAt !== null) reviewDuration = ((closedAt || now).getTime() - startedReviewAt.getTime()) / MS_IN_MINUTE;

  const newPRCycleMetrics = {
    codingDuration,
    pickupDuration,
    reviewDuration,
    reviewDepth,
    approved,
    reviewed,
  } satisfies Partial<NewMergeRequestMetric>

  // Note: since we know if a metric exists, is an update more efficient then an upsert ? 
  // ...Another approach is to have 2 upserts, one for the new metrics and one if the datesJunk is null
  /**
   * Options:
   * - Select Metric, Update/Insert DatesJunk, Upsert Metric <- current implementation
   * - Upsert Metric, Update/Insert DatesJunk, Optional Update Metric
   * 
   */
  await transform.db.insert(transform.entities.mergeRequestMetrics).values({
    usersJunk: 1,
    repository: transformRepository.id,
    mergeRequest: transformMergeRequest.id,
    datesJunk: datesJunkId,
    mrSize: 0,
    ...newPRCycleMetrics,
    handover: 0,
    closed: false,
    merged: false,
  })
    .onConflictDoUpdate({
      target: transform.entities.mergeRequestMetrics.mergeRequest,
      set: {
        codingDuration,
        pickupDuration,
        reviewDuration,
        reviewDepth,
        approved,
        reviewed,
      }
    })
    .run();
}
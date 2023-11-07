import { eq, and } from "drizzle-orm";
import type { ExtractEntities, TransformEntities, TransformFunction } from "./config";
import type { CommittedEvent, MergeRequest as ExtractMergeRequest, ReviewedEvent } from "@acme/extract-schema";

export type SetTimelineEventsInput = {
  mergeRequestId: ExtractMergeRequest["id"];
}
export type SetTimelineEventsOutput = void;
export type SetTimelineEventsExtractEntities = Pick<ExtractEntities, 'repositories' | 'mergeRequests' | 'timelineEvents' | 'mergeRequestNotes'>;
export type SetTimelineEventsTransformEntities = Pick<TransformEntities, 'repositories' | 'mergeRequests' | 'mergeRequestMetrics'>;

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
  if (!mergeRequest) throw new Error("Merge request not found");

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

  const transformMergeRequest = await transform.db.select({
    id: transform.entities.mergeRequests.id
  })
    .from(transform.entities.mergeRequests)
    .where(and(
      eq(transform.entities.repositories.externalId, repository.externalId),
      eq(transform.entities.repositories.forgeType, repository.forgeType),
    ))
    .get();
  if (!transformMergeRequest) throw new Error(`Merge request not yet transformed: ${mergeRequestId}`);

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
        reviewed = true; // Todo: is a comment a review ? I'm so confused now
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
   * 1. A merge request is ready for review
   * 2. A team member is requested to review the merge request
   * 3. The last commit before the first review
   */
  if (firstReadyForReviewAt !== null) startedPickupAt = firstReadyForReviewAt;
  else if (firstReviewRequestAt !== null) startedPickupAt = firstReviewRequestAt;
  else if (startedReviewAt !== null)
    startedPickupAt = finishedCodingAt;
  // Note: startedPickupAt will be null ONLY if there is a review/comment before the first commit.

  if (startedPickupAt === null && startedReviewAt !== null) console.warn("Warning: Review started without pickup for MR", mergeRequestId);

  const now = new Date();
  let codingDuration = 0;
  let pickupDuration = 0;
  let reviewDuration = 0;
  if (startedCodingAt !== null) codingDuration = ((startedPickupAt || now).getTime() - startedCodingAt.getTime()) / MS_IN_MINUTE;
  if (startedPickupAt !== null) pickupDuration = ((startedReviewAt || now).getTime() - startedPickupAt.getTime()) / MS_IN_MINUTE;
  if (startedReviewAt !== null) reviewDuration = ((closedAt || now).getTime() - startedReviewAt.getTime()) / MS_IN_MINUTE;

  // TODO: set dates junk

  await transform.db.insert(transform.entities.mergeRequestMetrics).values({
    usersJunk: 1,
    repository: transformRepository.id,
    mergeRequest: transformMergeRequest.id,
    datesJunk: 1,
    mrSize: 0,
    codingDuration,
    pickupDuration,
    reviewDuration,
    reviewDepth,
    approved,
    reviewed,
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
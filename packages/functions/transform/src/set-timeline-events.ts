import { eq, inArray } from "drizzle-orm";
import type { ExtractEntities, TransformEntities, TransformFunction } from "./config";
import type { NewMergeRequest as TransformedMergeRequest } from "@acme/transform-schema";
import type { MergeRequest as ExtractMergeRequest } from "@acme/extract-schema";
import { sql } from "drizzle-orm";

export type SetTimelineEventsInput = {
  mergeRequestId: ExtractMergeRequest["id"];
}
export type SetTimelineEventsOutput = void;
export type SetTimelineEventsExtractEntities = Pick<ExtractEntities, 'repositories' | 'mergeRequests' | 'timelineEvents' | 'mergeRequestNotes'>;
export type SetTimelineEventsTransformEntities = Pick<TransformEntities, 'mergeRequests'>;

export type SetTimelineEventsFunction = TransformFunction<SetTimelineEventsInput, SetTimelineEventsOutput, SetTimelineEventsExtractEntities, SetTimelineEventsTransformEntities>;

export const setTimelineEvents: SetTimelineEventsFunction = async (
  { mergeRequestId },
  { extract, transform }
) => {
  let firstReviewCommentAt: Date | null = null;
  let reviewDepth = 0;

  // TODO: Instead of this we could query count and select lowest createdAt
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
  let firstReviewAt: Date | null = null;
  let firstReviewRequestAt: Date | null = null;
  let firstReadyForReviewAt: Date | null = null;
  let closedAt: Date | null = null;

  let lastCommitBeforeFirstReviewAt: Date | null = null;
  let lastCommitBeforeFirstReviewCommentAt: Date | null = null;

  const timeline = await extract.db.select()
    .from(extract.entities.timelineEvents)
    .where(eq(extract.entities.timelineEvents.mergeRequestId, mergeRequestId))
    .all();

  for (const event of timeline) {
    switch (event.type) {
      case 'committed':
        if (firstCommitAt === null) firstCommitAt = event.timestamp;
        if (firstReviewAt === null) lastCommitBeforeFirstReviewAt = event.timestamp; // Note: What if first review is before first commit ?
        if (firstReviewCommentAt !== null && event.timestamp < firstReviewCommentAt) lastCommitBeforeFirstReviewCommentAt = event.timestamp;
        break;
      case 'commented':
      case 'reviewed':
        if (firstReviewAt === null) firstReviewAt = event.timestamp;
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

  let startedCodingAt: Date | null = null;
  let startedPickupAt: Date | null = null;
  let startedReviewAt: Date | null = null;

  if (firstCommitAt !== null) startedCodingAt = firstCommitAt;
  // TODO: what if no first commit ? SHouldn't happen in GitHub

}
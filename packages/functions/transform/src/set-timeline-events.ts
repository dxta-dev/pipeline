import { eq } from "drizzle-orm";
import type { ExtractEntities, TransformEntities, TransformFunction } from "./config";
import { type CommittedEvent, type MergeRequest as ExtractMergeRequest, type MergeRequestNote, type TimelineEvents } from "@acme/extract-schema";

export type SetTimelineEventsInput = {
  mergeRequest: ExtractMergeRequest
}
export type SetTimelineEventsOutput = {
  startedCodingAt?: Date;
  startedPickupAt?: Date;
  startedReviewAt?: Date;
  reviewDepth: number;
  reviewed: boolean; // TODO: can calculate based on reviewers lenght ?
  approved: boolean; // TODO: can calculate based on approvers lenght ?
};
export type SetTimelineEventsExtractEntities = Pick<ExtractEntities, 'repositories' | 'mergeRequests' | 'timelineEvents' | 'mergeRequestNotes'>;
export type SetTimelineEventsTransformEntities = Pick<TransformEntities, 'repositories' | 'mergeRequests' | 'mergeRequestMetrics' | 'dates' | 'mergeRequestDatesJunk'>;

export type SetTimelineEventsFunction = TransformFunction<SetTimelineEventsInput, SetTimelineEventsOutput, SetTimelineEventsExtractEntities, SetTimelineEventsTransformEntities>;

export const findFirstReviewCommentAt = (mergeRequest: ExtractMergeRequest, reviewComments: MergeRequestNote[]): Date | undefined => {
  let firstReviewCommentAt: Date | undefined;
  for (const reviewComment of reviewComments) {
    if (reviewComment.authorExternalId !== mergeRequest.authorExternalId
      && (firstReviewCommentAt === undefined || reviewComment.createdAt.getTime() < firstReviewCommentAt.getTime())
    ) { firstReviewCommentAt = reviewComment.createdAt; }
  }
  return firstReviewCommentAt;
}

export const findFirstReviewOrCommentAt = (mergeRequest: ExtractMergeRequest, reviewedOrCommentedEvents: TimelineEvents[]): Date | undefined => {
  let firstReviewOrCommentAt: Date | undefined;
  for (const event of reviewedOrCommentedEvents) {
    if (event.actorId !== mergeRequest.authorExternalId
      && (firstReviewOrCommentAt === undefined || event.timestamp.getTime() < firstReviewOrCommentAt.getTime())
    ) { firstReviewOrCommentAt = event.timestamp }
  }

  return firstReviewOrCommentAt;
}

export const findFirstReviewAt = (mergeRequest: ExtractMergeRequest, reviewedOrCommentedEvents: TimelineEvents[], reviewComments: MergeRequestNote[]): Date | undefined => {
  const firstReviewCommentAt = findFirstReviewCommentAt(mergeRequest, reviewComments);
  const firstReviewOrCommentAt = findFirstReviewOrCommentAt(mergeRequest, reviewedOrCommentedEvents);

  if (firstReviewCommentAt !== undefined && firstReviewOrCommentAt !== undefined)
    return firstReviewCommentAt.getTime() < firstReviewOrCommentAt.getTime() ? firstReviewCommentAt : firstReviewOrCommentAt;

  return firstReviewCommentAt || firstReviewOrCommentAt;
}

export const findFirstCommitAt = (commits: CommittedEvent[]): Date | undefined => {
  const firstCommit = commits[0];
  if (firstCommit !== undefined) return new Date(firstCommit.committedDate);
}

export const findLastCommitAtBeforeEvent = (commits: CommittedEvent[], event: Date): Date | undefined => {
  let lastCommitAt: Date | undefined;
  for (const commit of commits) {
    const commitAt = new Date(commit.committedDate);
    if (
      commitAt.getTime() < event.getTime()
      && (lastCommitAt === undefined || commitAt.getTime() > lastCommitAt.getTime())
    ) { lastCommitAt = commitAt; }
  }
  return lastCommitAt;
}

export const findLastConvertToDraftBeforeEvent = (mergeRequest: ExtractMergeRequest, convertToDrafts: TimelineEvents[], event?: Date): Date | undefined => {
  let lastConvertToDraftAt: Date | undefined;
  for (const convertToDraft of convertToDrafts) {
    if (
      (event === undefined || convertToDraft.timestamp.getTime() < event.getTime())
      && (lastConvertToDraftAt === undefined || convertToDraft.timestamp.getTime() > lastConvertToDraftAt.getTime())
    ) { lastConvertToDraftAt = convertToDraft.timestamp; }
  }
  return lastConvertToDraftAt;
}

export const findFirstReadyForReviewOrReviewRequestAfterEvent = (mergeRequest: ExtractMergeRequest, readyForReviewOrReviewRequests: TimelineEvents[], event?: Date): Date | undefined => {
  let firstReadyForReviewOrReviewRequestAt: Date | undefined;
  for (const readyForReviewOrReviewRequest of readyForReviewOrReviewRequests) {
    if (
      (event === undefined || readyForReviewOrReviewRequest.timestamp.getTime() > event.getTime())
      && (firstReadyForReviewOrReviewRequestAt === undefined || readyForReviewOrReviewRequest.timestamp.getTime() < firstReadyForReviewOrReviewRequestAt.getTime())
    ) { firstReadyForReviewOrReviewRequestAt = readyForReviewOrReviewRequest.timestamp; }
  }
  return firstReadyForReviewOrReviewRequestAt;
}

export const setTimelineEvents: SetTimelineEventsFunction = async (
  { mergeRequest },
  { extract }
) => {
  // TODO: Instead of this we could query count and select lowest createdAt. This could change if we authors for handovers
  const reviewComments = await extract.db.select()
    .from(extract.entities.mergeRequestNotes)
    .where(eq(extract.entities.mergeRequestNotes.mergeRequestId, mergeRequest.id))
    .all();

  const timeline = await extract.db.select()
    .from(extract.entities.timelineEvents)
    .where(eq(extract.entities.timelineEvents.mergeRequestId, mergeRequest.id))
    .all();

  timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const reviewedOrCommentedEvents = timeline.filter(event => event.type === 'reviewed' || event.type === 'commented');
  const convertToDraftEvents = timeline.filter(event => event.type === 'convert_to_draft');
  const readyForReviewEvents = timeline.filter(event => event.type === 'ready_for_review' || event.type === 'review_requested');
  const commits = timeline.filter(event => event.type === 'committed').map(event => JSON.parse(event.data as string) as CommittedEvent);

  const firstReviewAt = findFirstReviewAt(mergeRequest, reviewedOrCommentedEvents, reviewComments);
  const firstCommitAt = findFirstCommitAt(commits);

  const lastConvertToDraftAt = findLastConvertToDraftBeforeEvent(mergeRequest, convertToDraftEvents, firstReviewAt);
  let firstPickupEventAt = findFirstReadyForReviewOrReviewRequestAfterEvent(mergeRequest, readyForReviewEvents, lastConvertToDraftAt);

  if (firstReviewAt !== undefined && firstPickupEventAt === undefined) firstPickupEventAt = findLastCommitAtBeforeEvent(commits, firstReviewAt);


  return {
    reviewDepth: reviewComments.length + reviewedOrCommentedEvents.length,
    startedCodingAt:firstCommitAt,
    startedPickupAt: firstPickupEventAt,
    startedReviewAt: firstReviewAt,
    approved: false, // TODO: Implement
    reviewed: reviewedOrCommentedEvents.length !== 0,
  }
}
import { eq } from "drizzle-orm";
import type { ExtractEntities, TransformFunction } from "./config";
import type { ReviewedEvent, MergeRequest as ExtractMergeRequest, MergeRequestNote, TimelineEvents } from "@acme/extract-schema";

export type CalcTimelineEventsInput = {
  mergeRequest: ExtractMergeRequest
}
export type CalcTimelineEventsOutput = {
  startedCodingAt?: Date;
  startedPickupAt?: Date;
  startedReviewAt?: Date;
  reviewDepth: number;
  reviewed: boolean;
  approved: boolean;
};

export type CalcTimelineEventsExtractEntities = Pick<ExtractEntities, 'timelineEvents' | 'mergeRequestNotes'>;
export type CalcTimelineEventsTransformEntities = NonNullable<unknown>;

export type CalcTimelineEventsFunction = TransformFunction<CalcTimelineEventsInput, CalcTimelineEventsOutput, CalcTimelineEventsExtractEntities, CalcTimelineEventsTransformEntities>;

export const calcReviewDepth = (reviewComments: MergeRequestNote[], timeline: TimelineEvents[]): number => {
  // TODO: review depth should be avg of conversation length ??? Not sure if a PR has only one review or we count individual reviews/threads
  const numberOfReviewComments = reviewComments.length;
  const numberOfReviewsOrComments = timeline.filter(event => event.type === 'reviewed' || event.type === 'commented').length;
  return numberOfReviewComments + numberOfReviewsOrComments;
}

export const calcApproved = (timeline: TimelineEvents[]): boolean => !!timeline.find(event => event.type === 'reviewed'
  && (JSON.parse(event.data as string) as ReviewedEvent).state === 'approved');

export const calcReviewed = (timeline: TimelineEvents[]): boolean => !!timeline.find(event => event.type === 'reviewed');

export const calcStartedCodingAt = (timeline: TimelineEvents[]) => {
  const commits = timeline.filter(event => event.type === 'committed');
  const firstCommitAt = commits[0]?.timestamp;

  return firstCommitAt;
}

export const calcStartedPickupAt = (timeline: TimelineEvents[], startedReviewAt: Date | undefined): Date | undefined => {
  const convertToDraftEvents = timeline.filter(event => event.type === 'convert_to_draft');
  const convertToDraftEventsBeforeReviewStart = startedReviewAt ? convertToDraftEvents.filter(event => event.timestamp.getTime() < startedReviewAt.getTime()) : convertToDraftEvents;
  const lastConvertToDraft = convertToDraftEventsBeforeReviewStart[convertToDraftEventsBeforeReviewStart.length - 1];

  const pickupEvents = timeline.filter(event => event.type === 'ready_for_review' || event.type === 'review_requested');
  const pickupEventsAfterConvertToDraft = lastConvertToDraft ? pickupEvents.filter(event => event.timestamp.getTime() > lastConvertToDraft.timestamp.getTime()) : pickupEvents;

  const firstPickupEvent = pickupEventsAfterConvertToDraft[0]?.timestamp;
  if (firstPickupEvent) return firstPickupEvent;

  if (!startedReviewAt) return undefined;

  const commits = timeline.filter(event => event.type === 'committed');
  // TODO: Committed Date vs Authored Date? Need to know which one stays unchanged during force pushes and set that as the event timestmap
  const commitsBeforeReviewStart = commits.filter(event => event.timestamp.getTime() < startedReviewAt.getTime());
  const lastCommitBeforeReviewStart = commitsBeforeReviewStart[commitsBeforeReviewStart.length - 1];

  // Note: if there are weird force pushes this could break in theory (Cody:, but I don't think it will happen)
  return lastCommitBeforeReviewStart?.timestamp;
}

export const calcStartedReviewAt = (mergeRequest: ExtractMergeRequest, timeline: TimelineEvents[], reviewComments: MergeRequestNote[]): Date | undefined => {
  const nonOwnerReviewComments = reviewComments.filter(reviewComment => reviewComment.authorExternalId !== mergeRequest.authorExternalId);
  const nonOwnerReviewsOrComments = timeline.filter(event => event.type === 'reviewed' || event.type === 'commented').filter(event => event.actorId !== mergeRequest.authorExternalId);

  const firstReviewCommentAt = nonOwnerReviewComments[0]?.createdAt;
  const firstReviewOrCommentAt = nonOwnerReviewsOrComments[0]?.timestamp;

  if (!firstReviewCommentAt || !firstReviewOrCommentAt) return firstReviewCommentAt || firstReviewOrCommentAt;

  // Note: logically, this shouldn't be returned this way...
  // ... The first review comment will always be the first event, but only if the first review has review comments (diff notes).
  if (firstReviewCommentAt.getTime() < firstReviewOrCommentAt.getTime()) return firstReviewCommentAt;

  return firstReviewOrCommentAt;
}


export const calcTimelineEvents: CalcTimelineEventsFunction = async (
  { mergeRequest },
  { extract }
) => {
  // TODO: Instead of this we could query count and select lowest createdAt. This could change if we need authors for handovers
  const reviewComments = await extract.db.select()
    .from(extract.entities.mergeRequestNotes)
    .where(eq(extract.entities.mergeRequestNotes.mergeRequestId, mergeRequest.id))
    .all();

  const timeline = await extract.db.select()
    .from(extract.entities.timelineEvents)
    .where(eq(extract.entities.timelineEvents.mergeRequestId, mergeRequest.id))
    .all();

  reviewComments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const startedReviewAt = calcStartedReviewAt(mergeRequest, timeline, reviewComments);
  const startedPickupAt = calcStartedPickupAt(timeline, startedReviewAt);
  const startedCodingAt = calcStartedCodingAt(timeline);

  return {
    startedCodingAt,
    startedPickupAt,
    startedReviewAt,
    reviewDepth: calcReviewDepth(reviewComments, timeline), // TODO: implement correctly
    approved: calcApproved(timeline),
    reviewed: calcReviewed(timeline),
  }
}
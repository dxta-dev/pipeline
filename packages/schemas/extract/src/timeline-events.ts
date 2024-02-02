import { integer, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { type InferInsertModel, type InferSelectModel, sql } from 'drizzle-orm';
import { z } from 'zod';
import { Enum } from './enum-column';
import { mergeRequests } from './merge-requests';
import { sqliteTable } from "./extract-table";

export const TimelineEventTypes = [
  'assigned',
  'closed',
  'commented',
  'committed',
  'convert_to_draft',
  'merged',
  'ready_for_review',
  'review_request_removed',
  'review_requested',
  'reviewed',
  'unassigned',
] as const;

export type TimelineEventType = typeof TimelineEventTypes[number];

export const timelineEvents = sqliteTable('timeline_events', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
  type: Enum('type',
    {
      enum: TimelineEventTypes,
    }
  ).notNull(),
  mergeRequestId: integer('merge_request_id').references(() => mergeRequests.id).notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull(),
  actorName: text('actor_name').notNull(),
  actorId: integer('actor_id'),
  actorEmail: text('actor_email'),
  data: text('data', { mode: 'json' }),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (timelineEvents) => ({
  uniqueId: uniqueIndex('timeline_events_external_id_merge_request_id_type_idx').on(timelineEvents.externalId, timelineEvents.mergeRequestId, timelineEvents.type),
}));


export const AssignEventSchema = z.object({
  assigneeId: z.number(),
  assigneeName: z.string(),
})

// ClosedEventSchema is empty

// CommentedEventSchema is empty

export const CommittedEventSchema = z.object({
  committedDate: z.coerce.date(),
  committerEmail: z.string(),
  committerName: z.string(),
});

// ConvertToDraftEventSchema is empty

// MergedEventSchema is empty

// ReadyForReviewEventSchema is empty


export const ReviewRequestEventSchema = z.object({
  requestedReviewerId: z.number().optional(),
  requestedReviewerName: z.string().optional(),
})

export const ReviewedEventSchema = z.object({
  state: z.string(),
});

export type AssignEvent = { type: "assigned" | "unassigned"; data: z.infer<typeof AssignEventSchema>; };
export type ClosedEvent = { type: "closed"; data: null; };
export type CommentedEvent = { type: "commented"; data: null; };
export type CommittedEvent = { type: "committed"; data: z.infer<typeof CommittedEventSchema>; };
export type ConvertToDraftEvent = { type: "convert_to_draft"; data: null; };
export type MergedEvent = { type: "merged"; data: null; };
export type ReadyForReviewEvent = { type: "ready_for_review"; data: null; }
export type ReviewRequestEvent = { type: "review_requested" | "review_request_removed"; data: z.infer<typeof ReviewRequestEventSchema>; };
export type ReviewedEvent = { type: "reviewed"; data: z.infer<typeof ReviewedEventSchema>; };

export type TimelineEventTypeUnion = AssignEvent | ClosedEvent | CommentedEvent | CommittedEvent | ConvertToDraftEvent
  | MergedEvent | ReadyForReviewEvent | ReviewRequestEvent | ReviewedEvent;

export type TimelineEvent = InferSelectModel<typeof timelineEvents>;
export type NewTimelineEvent = InferInsertModel<typeof timelineEvents>;

export type TimelineEventOfType<T extends TimelineEventTypeUnion = TimelineEventTypeUnion> = TimelineEvent & T
export type NewTimelineEventOfType<T extends TimelineEventTypeUnion = TimelineEventTypeUnion> = NewTimelineEvent & T;

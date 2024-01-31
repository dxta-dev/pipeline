import { integer, text,uniqueIndex } from "drizzle-orm/sqlite-core";
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


export const AssignedEventSchema = z.object({
  assigneeId: z.number(),
  assigneeName: z.string(),
});

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


export const ReviewRequestRemovedEventSchema = z.object({
  requestedReviewerId: z.number().optional(),
  requestedReviewerName: z.string().optional(),
});

export const ReviewRequestedEventSchema = z.object({
  requestedReviewerId: z.number().optional(),
  requestedReviewerName: z.string().optional(),
});

export const ReviewedEventSchema = z.object({
  state: z.string(),
});

export const UnassignedEventSchema = z.object({
  assigneeId: z.number(),
  assigneeName: z.string(),
});

export type AssignedEvent = z.infer<typeof AssignedEventSchema>;
export type CommittedEvent = z.infer<typeof CommittedEventSchema>;
export type ReviewRequestRemovedEvent = z.infer<typeof ReviewRequestRemovedEventSchema>;
export type ReviewRequestedEvent = z.infer<typeof ReviewRequestedEventSchema>;
export type ReviewedEvent = z.infer<typeof ReviewedEventSchema>;
export type UnassignedEvent = z.infer<typeof UnassignedEventSchema>;

export type TimelineEvents = InferSelectModel<typeof timelineEvents>;
export type NewTimelineEvents = InferInsertModel<typeof timelineEvents>;

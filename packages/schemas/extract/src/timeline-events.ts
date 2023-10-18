import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { type InferInsertModel, type InferSelectModel, sql } from 'drizzle-orm';
import { z } from 'zod';
import { Enum } from './enum-column';

export const timelineEvents = sqliteTable('timeline_events', {
  id: integer('id').primaryKey(),
  external_id: integer('external_id').notNull(),
  type: Enum('type',
    {
      enum:
        [
          'assigned',
          'closed',
          'commented',
          'committed',
          'convert_to_draft',
          'deployed',
          'head_ref_force_pushed',
          'merged',
          'ready_for_review',
          'review_request_removed',
          'review_requested',
          'reviewed',
          'unassigned',
        ]
    }
  ).notNull(),
  mergeRequestId: integer('merge_request_id').notNull(),
  timestamp: integer('timestamp').notNull(),
  actorName: text('actor_name').notNull(),
  actorId: integer('actor_id'),
  actorEmail: text('actor_email'),
  data: text('data', { mode: 'json' }).notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});


export const AssignedEventSchema = z.object({
  assignee: z.object({
    id: z.number(),
    name: z.string(),
  }),
});

export const CommittedEventSchema = z.object({
  committer: z.object({
    email: z.number(),
    name: z.string(),
  }),
  message: z.string(),
});

export const CommentedEventEventSchema = z.object({
  body: z.string(),
});

export const ReviewRequestedEventSchema = z.object({
  requestedReviewere: z.object({
    id: z.number(),
    name: z.string(),
  }),
});

export const ReviewSchemaEventSchema = z.object({
  review: z.object({
    id: z.number(),
    name: z.string(),
  }),
  body: z.string(),
  state: z.string(),
});

export type AssignedEvent = z.infer<typeof AssignedEventSchema>;
export type CommittedEvent = z.infer<typeof CommittedEventSchema>;
export type CommentedEventEvent = z.infer<typeof CommentedEventEventSchema>;
export type ReviewRequestedEvent = z.infer<typeof ReviewRequestedEventSchema>;
export type ReviewSchemaEvent = z.infer<typeof ReviewSchemaEventSchema>;

export type TimelineEvents = InferSelectModel<typeof timelineEvents>;
export type NewTimelineEvents = InferInsertModel<typeof timelineEvents>;

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { integer, index } from 'drizzle-orm/sqlite-core';
import { repositories } from './repositories';
import { mergeRequests } from './merge-requests';
import { forgeUsers } from './forge-users';
import { dates } from './dates';
import { sqliteTable } from './transform-table';
import { Enum } from './enum-column';

export type MergeRequestEventType = typeof MergeRequestEventTypes[number];
export type ReviewStateType = typeof ReviewStates[number];

export const MergeRequestEventTypes = [
  'unknown',
  'opened',
  'started_coding',
  'started_pickup',
  'started_review',
  'noted',
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

export const ReviewStates = [
  'unknown',
  'approved',
  'changes_requested',
  'commmented',
] as const;

export const mergeRequestEvents = sqliteTable('merge_request_events', {
  id: integer('id').primaryKey(),

  actor: integer('actor').notNull().references(() => forgeUsers.id),
  subject: integer('subject').notNull().references(() => forgeUsers.id),
  occuredOn: integer('occured_on').notNull().references(() => dates.id),
  commitedAt: integer('commited_at').notNull().references(() => dates.id),
  repository: integer('repository').notNull().references(() => repositories.id),
  mergeRequest: integer('merge_request').notNull().references(() => mergeRequests.id),

  timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull(),
  reviewState: Enum('review_state_type', { enum: ReviewStates }).notNull(),
  mergeRequestEventType: Enum('merge_request_event_type', { enum: MergeRequestEventTypes }).notNull(),

  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (events) => ({
  eventsOccuredOnIndex: index('merge_request_events_occured_on_idx').on(events.occuredOn),
  eventsMergeRequestIndex: index('merge_request_events_merge_request_idx').on(events.mergeRequest),
}));

export type MergeRequestEvent = InferSelectModel<typeof mergeRequestEvents>;
export type NewMergeRequestEvent = InferInsertModel<typeof mergeRequestEvents>;

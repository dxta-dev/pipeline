import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { sqliteTable, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { dates } from './dates';

export const mergeRequestDatesJunk = sqliteTable('merge_request_fact_dates_junk', {
  id: integer('id').primaryKey(),
  
  mergedAt: integer('merged_at').notNull().references(() => dates.id),
  openedAt: integer('opened_at').notNull().references(() => dates.id),
  closedAt: integer('closed_at').notNull().references(() => dates.id),
  lastUpdatedAt: integer('last_updated_at').notNull().references(() => dates.id),
  startedCodingAt: integer('started_coding_at').notNull().references(() => dates.id),
  startedPickupAt: integer('started_pickup_at').notNull().references(() => dates.id),
  startedReviewAt: integer('started_review_at').notNull().references(() => dates.id),

  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (mergeRequestDatesJunk) => ({
  uniquerDateJunkIndex: uniqueIndex('merge_request_fact_dates_junk_merged_at_opened_at_closed_at_idx').on(mergeRequestDatesJunk.mergedAt, mergeRequestDatesJunk.openedAt, mergeRequestDatesJunk.closedAt)
}));

export type MergeRequestDatesJunk = InferSelectModel<typeof mergeRequestDatesJunk>;
export type NewMergeRequestDatesJunk = InferInsertModel<typeof mergeRequestDatesJunk>;

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { sqliteTable, integer } from 'drizzle-orm/sqlite-core';
import { repositories } from './repositories';
import { forgeUsers } from './forge-users';
import { mergeRequests } from './merge-requests';
import { dates } from './dates';

export const mergeRequestReports = sqliteTable('merge_request_reports', {
  id: integer('id').primaryKey(),
  // Dimensions
  forgeUserId: integer('forge_user_id').notNull().references(() => forgeUsers.id),
  repositoryId: integer('repository_id').notNull().references(() => repositories.id),
  mergeRequestId: integer('merge_request_id').notNull().references(() => mergeRequests.id),
  dateId: integer('date_id').notNull().references(() => dates.id),
  // Facts
  codingDuration: integer('coding_duration').notNull(),
  reviewStartDelay: integer('review_start_delay').notNull(),
  reviewDuration: integer('review_duration').notNull(),
  linesChanged: integer('lines_changed').notNull(),
  reviewed: integer('reviewed', { mode: 'boolean' }).default(false),
  approved: integer('approved', { mode: 'boolean' }).default(false),
  reviewDepth: integer('review_depth').notNull(),
  // Meta
  _createdAt: integer('__created_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
});

export type MergeRequestReport = InferSelectModel<typeof mergeRequestReports>;
export type NewMergeRequestReport = InferInsertModel<typeof mergeRequestReports>;
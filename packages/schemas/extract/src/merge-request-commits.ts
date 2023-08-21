import type { InferModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const mergeRequestCommits = sqliteTable('merge_request_commits', {
  id: integer('id').primaryKey(),
  /* Gitlab -> iid */
  mergeRequestId: integer('merge_request_id').notNull(),
  externalId: integer('external_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  authoredDate: integer('authored_date', { mode: 'timestamp_ms' }).notNull(),
  committedDate: integer('committed_date', { mode: 'timestamp_ms' }).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  authorName: text('author_name').notNull(),
  authorEmail: text('author_email').notNull(),
  committerName: text('committer_name'),
  committerEmail: text('committer_email'),
  _createdAt: integer('__created_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
}, (commits) => ({
  uniqueExternalId: uniqueIndex('merge_request_commits_external_id_idx').on(commits.externalId),
}));

export type MergeRequestCommit = InferModel<typeof mergeRequestCommits>;
export type NewMergeRequestCommit = InferModel<typeof mergeRequestCommits, 'insert'>;

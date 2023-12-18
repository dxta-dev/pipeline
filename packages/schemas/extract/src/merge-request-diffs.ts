import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { mergeRequests } from './merge-requests';
import { sqliteTable } from './extract-table';

export const mergeRequestDiffs = sqliteTable('merge_request_diffs', {
  id: integer('id').primaryKey(),
  mergeRequestId: integer('merge_request_id').references(() => mergeRequests.id).notNull(),
  newPath: text('new_path').notNull(),
  oldPath: text('old_path').notNull(),
  aMode: text('a_mode').notNull(),
  bMode: text('b_mode').notNull(),
  newFile: integer('new_file', { mode: 'boolean' }).notNull(),
  renamedFile: integer('renamed_file', { mode: 'boolean' }).notNull(),
  deletedFile: integer('deleted_file', { mode: 'boolean' }).notNull(),
  diff: text('diff').notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (diffs) => ({
  uniqueExternalDiffId: uniqueIndex('diffs_merge_request_id_newPath_idx').on(diffs.mergeRequestId, diffs.newPath),
}));

export type MergeRequestDiff = InferSelectModel<typeof mergeRequestDiffs>;
export type NewMergeRequestDiff = InferInsertModel<typeof mergeRequestDiffs>;

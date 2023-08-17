import type { InferModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const mergeRequestDiffs = sqliteTable('merge_request_diffs', {
  id: integer('id').primaryKey(),
  /* Gitlab -> iid */
  mergeRequestId: integer('merge_request_id').notNull(),
  newPath: text('new_path').notNull(),
  oldPath: text('old_path').notNull(),
  aMode: text('a_mode').notNull(),
  bMode: text('b_mode').notNull(),
  newFile: integer('new_file', { mode: 'boolean' }).notNull(),
  renamedFile: integer('renamed_file', { mode: 'boolean' }).notNull(),
  deletedFile: integer('deleted_file', { mode: 'boolean' }).notNull(),
  diff: text('diff').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
}, (diffs) => ({
  uniqueMergeRequestId: uniqueIndex('diffs_merge_request_id_newPath_idx').on(diffs.mergeRequestId, diffs.newPath),
}));

export type MergeRequestDiff = InferModel<typeof mergeRequestDiffs>;
export type NewMergeRequestDiff = InferModel<typeof mergeRequestDiffs, 'insert'>;

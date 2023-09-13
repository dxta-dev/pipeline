import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { sqliteTable, integer, uniqueIndex, text } from 'drizzle-orm/sqlite-core';

export const mergeRequestNotes = sqliteTable('merge_request_notes', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
  mergeRequestId: integer('merge_request_id').notNull(), // internalId not mergeRequestId
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  authorUsername: text('author_username').notNull(),
  authorExternalId: integer('author_external_id').notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
}, (notes)=>({
  uniqueExternalId: uniqueIndex('merge_request_notes_external_id_idx').on(notes.externalId),
}));

export type MergeRequestNote = InferSelectModel<typeof mergeRequestNotes>;
export type NewMergeRequestNote = InferInsertModel<typeof mergeRequestNotes>;

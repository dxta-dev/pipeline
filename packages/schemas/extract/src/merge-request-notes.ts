import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { integer, uniqueIndex, text } from 'drizzle-orm/sqlite-core';
import { mergeRequests } from './merge-requests';
import { sqliteTable } from './extract-table';

export const mergeRequestNotes = sqliteTable('merge_request_notes', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
  mergeRequestId: integer('merge_request_id').references(() => mergeRequests.id).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  authorUsername: text('author_username').notNull(),
  authorExternalId: integer('author_external_id').notNull(),
  body: text('body').notNull(),
  system: integer('system', { mode: 'boolean' }).notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (notes) => ({
  uniqueExternalId: uniqueIndex('merge_request_notes_external_id_idx').on(notes.mergeRequestId, notes.externalId),
}));

export type MergeRequestNote = InferSelectModel<typeof mergeRequestNotes>;
export type NewMergeRequestNote = InferInsertModel<typeof mergeRequestNotes>;

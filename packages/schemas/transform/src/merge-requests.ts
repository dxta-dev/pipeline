import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { Enum } from './enum-column';

export const mergeRequests = sqliteTable('merge_requests', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
  forgeType: Enum('forge_type', { enum: ['unknown', 'github', 'gitlab'] }).notNull(),
  // TODO: tenantId: integer('tenant_id').notNull(),
  title: text('title').notNull(),
  webUrl: text('web_url').notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
  _updatedAt: integer('__updated_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
}, (mergeRequests) => ({
  uniqueExternalIdForgeTypeIndex: uniqueIndex('merge_requests_external_id_forge_type_idx').on(mergeRequests.externalId, mergeRequests.forgeType)
}));

export type MergeRequest = InferSelectModel<typeof mergeRequests>;
export type NewMergeRequest = InferInsertModel<typeof mergeRequests>;
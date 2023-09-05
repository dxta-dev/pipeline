import type { InferModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const mergeRequests = sqliteTable('merge_requests', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
  forgeType: text('forge_type', { enum: ['github', 'gitlab'] }).notNull(),
  // TODO: tenantId: integer('tenant_id').notNull(),
  title: text('title').notNull(),
  // TODO: url: text('url').notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
}, (mergeRequests) => ({
  uniqueExternalIdForgeTypeIndex: uniqueIndex('merge_requests_external_id_forge_type_idx').on(mergeRequests.externalId, mergeRequests.forgeType)
}));

export type MergeRequest = InferModel<typeof mergeRequests>;
export type NewMergeRequest = InferModel<typeof mergeRequests, 'insert'>;
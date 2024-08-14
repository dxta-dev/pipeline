import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { Enum } from './enum-column';
import { sqliteTable } from './transform-table';
import { branches } from './branches';

export const mergeRequests = sqliteTable('merge_requests', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
  canonId: integer('canon_id').notNull().default(-1),
  forgeType: Enum('forge_type', { enum: ['unknown', 'github', 'gitlab'] }).notNull(),
  // TODO: tenantId: integer('tenant_id').notNull(),
  title: text('title').notNull(),
  description: text('description').default(''),
  webUrl: text('web_url').notNull(),
  mergeCommitSha: text('merge_commit_sha'),
  targetBranch: integer('target_branch').notNull().default(1).references(() => branches.id),
  sourceBranch: integer('source_branch').notNull().default(1).references(() => branches.id),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (mergeRequests) => ({
  uniqueExternalIdForgeTypeIndex: uniqueIndex('merge_requests_external_id_forge_type_idx').on(mergeRequests.externalId, mergeRequests.forgeType)
}));

export type MergeRequest = InferSelectModel<typeof mergeRequests>;
export type NewMergeRequest = InferInsertModel<typeof mergeRequests>;

import type { InferModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const repositories = sqliteTable('repositories', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
  forgeType: text('forge_type', { enum: ['github', 'gitlab'] }).notNull(),
  // tenantId: integer('tenant_id').notNull(),
  name: text('name').notNull(),
  // url: text('url').notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
}, (repositories) => ({
  uniqueExternalIdForgeTypeIndex: uniqueIndex('repositories_external_id_forge_type_idx').on(repositories.externalId, repositories.forgeType)
}));

export type Repository = InferModel<typeof repositories>;
export type NewRepository = InferModel<typeof repositories, 'insert'>;
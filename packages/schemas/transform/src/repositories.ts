import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { Enum } from './enum-column';
import { sqliteTable } from './transform-table';

export const repositories = sqliteTable('repositories', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
  forgeType: Enum('forge_type', { enum: ['unknown', 'github', 'gitlab'] }).notNull(),
  name: text('name').notNull(),
  namespaceName: text('namespace_name').default(''),
  // url: text('url').notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (repositories) => ({
  uniqueExternalIdForgeTypeIndex: uniqueIndex('repositories_external_id_forge_type_idx').on(repositories.externalId, repositories.forgeType)
}));

export type Repository = InferSelectModel<typeof repositories>;
export type NewRepository = InferInsertModel<typeof repositories>;

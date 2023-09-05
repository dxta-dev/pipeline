import type { InferModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const forgeUsers = sqliteTable('forge_users', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
  forgeType: text('forge_type', { enum: ['github', 'gitlab'] }).notNull(),
  // TODO: tenantId: integer('tenant_id').notNull(),
  name: text('name').notNull(),
  // TODO: url: text('url').notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
}, (forgeUsers) => ({
  uniqueExternalIdForgeTypeIndex: uniqueIndex('forge_users_external_id_forge_type_idx').on(forgeUsers.externalId, forgeUsers.forgeType)
}));

export type ForgeUser = InferModel<typeof forgeUsers>;
export type NewForgeUser = InferModel<typeof forgeUsers, 'insert'>;

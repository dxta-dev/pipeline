import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { Enum } from './enum-column';
import { sqliteTable } from './transform-table';

export const forgeUsers = sqliteTable('forge_users', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
  forgeType: Enum('forge_type', { enum: ['unknown', 'github', 'gitlab'] }).notNull(),
  // TODO: tenantId: integer('tenant_id').notNull(),
  name: text('name').notNull(),
  bot: integer('bot', { mode: 'boolean' }).notNull(),
  // TODO: url: text('url').notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (forgeUsers) => ({
  uniqueExternalIdForgeTypeIndex: uniqueIndex('forge_users_external_id_forge_type_idx').on(forgeUsers.externalId, forgeUsers.forgeType)
}));

export type ForgeUser = InferSelectModel<typeof forgeUsers>;
export type NewForgeUser = InferInsertModel<typeof forgeUsers>;

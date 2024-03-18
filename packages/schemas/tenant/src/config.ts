import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sqliteTable } from './tenant-table';
import { teams } from './teams';

export const tenantConfig = sqliteTable('config', {
  id: integer('id').primaryKey(),
  defaultTeam: integer('default_team').notNull().references(() => teams.id),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (config) => ({
  uniqueTenantConfig: uniqueIndex('tenant_config_unique_idx').on(config.defaultTeam),
}));

export type TenantConfig = InferSelectModel<typeof tenantConfig>;
export type NewTenantConfig = InferInsertModel<typeof tenantConfig>;

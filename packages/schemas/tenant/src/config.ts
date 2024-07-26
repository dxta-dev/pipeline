import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sqliteTable } from './tenant-table';

export const tenantConfig = sqliteTable('config', {
  id: integer('id').primaryKey(),
  hqTimezone: integer('hq_timezone').notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (config) => ({
  uniqueTenantConfig: uniqueIndex('tenant_config_unique_idx').on(config.hqTimezone),
}));

export type TenantConfig = InferSelectModel<typeof tenantConfig>;
export type NewTenantConfig = InferInsertModel<typeof tenantConfig>;

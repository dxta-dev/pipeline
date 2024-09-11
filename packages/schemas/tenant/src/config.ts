import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { integer, text } from 'drizzle-orm/sqlite-core';
import { sqliteTable } from './tenant-table';

export const tenantConfig = sqliteTable('config', {
  id: integer('id').primaryKey(),
  tzdata: text('tzdata').notNull().default('UTC'),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export type TenantConfig = InferSelectModel<typeof tenantConfig>;
export type NewTenantConfig = InferInsertModel<typeof tenantConfig>;

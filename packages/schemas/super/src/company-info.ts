import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants';

export const companyInfo = sqliteTable('company_info', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  logoUrl: text('logo_url').notNull(),
  screenshotUrl: text('screenshot_url').notNull(),
  description: text('description').notNull(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export type CompanyInfo = InferSelectModel<typeof companyInfo>;
export type NewCompanyInfo = InferInsertModel<typeof companyInfo>;

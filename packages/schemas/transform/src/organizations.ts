import type { InferModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const organizations = sqliteTable('organizations', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  external_id: text('external_id'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
});

export type Organization = InferModel<typeof organizations>;
export type NewOrganization = InferModel<typeof organizations, 'insert'>;

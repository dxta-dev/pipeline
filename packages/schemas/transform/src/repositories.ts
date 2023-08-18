import type { InferModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { organizations } from './organizations';
import { projects } from './projects';

export const repositories = sqliteTable('repositories', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  projectId: integer('projectId').notNull().references(() => projects.id),
  organizationId: integer('organizationId').notNull().references(() => organizations.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
});

export type Repository = InferModel<typeof repositories>;
export type NewRepository = InferModel<typeof repositories, 'insert'>;

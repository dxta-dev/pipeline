import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { sql } from 'drizzle-orm';
import { sqliteTable, integer,text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const repositories = sqliteTable('repositories', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
  name: text('name').notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
}, (projects) => ({
  uniqueExternalId: uniqueIndex('repositories_external_id_idx').on(projects.externalId),
}));

export type Repository = InferSelectModel<typeof repositories>;
export type NewRepository = InferInsertModel<typeof repositories>;
export const NewRepositorySchema = createInsertSchema(repositories, {
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
});
export const RepositorySchema = createSelectSchema(repositories, {
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
});

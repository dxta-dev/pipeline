import type { InferModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { sqliteTable, integer,text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const repositories = sqliteTable('repositories', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
}, (projects) => ({
  uniqueExternalId: uniqueIndex('repositories_external_id_idx').on(projects.externalId),
}));

export type Repository = InferModel<typeof repositories>;
export type NewRepository = InferModel<typeof repositories, 'insert'>;
export const NewRepositorySchema = createInsertSchema(repositories, {
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export const RepositorySchema = createSelectSchema(repositories, {
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

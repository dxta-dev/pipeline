import type { InferModel } from 'drizzle-orm';
import { sqliteTable, integer,text, uniqueIndex } from 'drizzle-orm/sqlite-core';
=
export const repositories = sqliteTable('repositories', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
  name: text('name').notNull(),
}, (projects) => ({
  uniqueExternalId: uniqueIndex('repositories_external_id_idx').on(projects.externalId),
}));

export type Repository = InferModel<typeof repositories>;
export type NewRepository = InferModel<typeof repositories, 'insert'>;

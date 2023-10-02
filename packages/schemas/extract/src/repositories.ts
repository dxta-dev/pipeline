import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sqliteTable, integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { Enum } from './enum-column';

export const repositories = sqliteTable('repositories', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
  forgeType: Enum('forge_type', { enum: ['github', 'gitlab'] }).notNull(),
  name: text('name').notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
  _updatedAt: integer('__updated_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
}, (repositories) => ({
  uniqueExternalId: uniqueIndex('repositories_external_id_idx').on(repositories.externalId, repositories.forgeType),
}));

export type Repository = InferSelectModel<typeof repositories>;
export type NewRepository = InferInsertModel<typeof repositories>;
export const NewRepositorySchema = createInsertSchema(repositories, {
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
  forgeType: z.literal('github').or(z.literal('gitlab')),
});
export const RepositorySchema = createSelectSchema(repositories, {
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
  forgeType: z.literal('github').or(z.literal('gitlab')),
});

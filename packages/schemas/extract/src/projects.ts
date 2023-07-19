import type { InferModel } from 'drizzle-orm';
import { sqliteTable, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
}, (projects) => ({
  uniqueExternalId: uniqueIndex('projects_gitlab_id_idx').on(projects.externalId),
}));

export type Project = InferModel<typeof projects>;
export type NewProject = InferModel<typeof projects, 'insert'>;

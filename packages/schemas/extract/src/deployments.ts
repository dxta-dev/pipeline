import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { Enum } from './enum-column';
import { sqliteTable } from './extract-table';
import { repositories } from './repositories';

export const deployments = sqliteTable('deployments', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
  repositoryId: integer('repository_id').references(() => repositories.id).notNull(),
  env: text('name'),
  url: text('url'),
  sha: text('sha'), // git deployed sha
  ref: text('ref'), // git deployed ref
  isMarkedAsProd: integer('is_prod_mark', { mode: 'boolean' }), // used by github, non-
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (deployments) => ({
  uniqueExternalId: uniqueIndex('deployments_external_id_idx').on(deployments.externalId, deployments.repositoryId),
}));

export type Deployment = InferSelectModel<typeof deployments>;
export type NewDeployment = InferInsertModel<typeof deployments>;
export const NewDeploymentSchema = createInsertSchema(deployments, {
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
});
export const DeploymentSchema = createSelectSchema(deployments, {
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
});

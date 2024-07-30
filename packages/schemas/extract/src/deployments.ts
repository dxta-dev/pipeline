import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { sqliteTable } from './extract-table';
import { repositories } from './repositories';
import { Enum } from './enum-column';

export const deploymentsStatusEnum = ['unknown', 'pending', 'success', 'failure'] as const;

export const deployments = sqliteTable('deployments', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
  repositoryId: integer('repository_id').references(() => repositories.id).notNull(),
  name: text('name').notNull(),
  gitSha: text('git_sha').notNull(),
  status: Enum('status', { enum: deploymentsStatusEnum }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  deployedAt: integer('deployed_at', { mode: 'timestamp_ms' }),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (deployments) => ({
  uniqueExternalId: uniqueIndex('deployments_external_id_idx').on(deployments.externalId, deployments.repositoryId)
}));

export type Deployment = InferSelectModel<typeof deployments>;
export type NewDeployment = InferInsertModel<typeof deployments>;
export const DeploymentSchema = createSelectSchema(deployments, {
  status: z.enum(deploymentsStatusEnum),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deployedAt: z.coerce.date(),
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
});
export const NewDeploymentSchema = createInsertSchema(deployments, {
  status: z.enum(deploymentsStatusEnum),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deployedAt: z.coerce.date(),
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
});

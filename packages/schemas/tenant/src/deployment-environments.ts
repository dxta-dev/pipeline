import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTable } from './tenant-table';
import { Enum } from './enum-column';

export const deploymentEnvironments = sqliteTable('deployment_environments', {
  id: integer('id').primaryKey(),
  repositoryExternalId: integer('repository_external_id').notNull(),
  forgeType: Enum('forge_type', { enum: ['github', 'gitlab'] }).notNull(),
  environment: text('environment').notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export type DeploymentEnvironment = InferSelectModel<typeof deploymentEnvironments>;
export type NewDeploymentEnvironment = InferInsertModel<typeof deploymentEnvironments>;

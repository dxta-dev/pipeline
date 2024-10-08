import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTable } from './tenant-table';
import { Enum } from './enum-column';

export const cicdDeployWorkflows = sqliteTable('cicd_deploy_workflows', {
  id: integer('id').primaryKey(),
  workflowExternalid: integer('workflow_external_id').notNull(),
  repositoryExternalId: integer('repository_external_id').notNull(),
  forgeType: Enum('forge_type', { enum: ['github', 'gitlab'] }).notNull(),
  branch: text('branch'),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export type CicdDeployWorkflow = InferSelectModel<typeof cicdDeployWorkflows>;
export type NewCicdDeployWorkflow = InferInsertModel<typeof cicdDeployWorkflows>;


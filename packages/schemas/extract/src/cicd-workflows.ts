import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { sqliteTable } from './extract-table';
import { repositories } from './repositories';
import { Enum } from './enum-column';

const cicdWorkflowRunnersEnum = ['github_actions'] as const;

export const cicdWorkflows = sqliteTable('cicd_workflows', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
  repositoryId: integer('repository_id').references(() => repositories.id).notNull(),
  runner: Enum('runner', { enum: cicdWorkflowRunnersEnum }).notNull(),
  name: text('name').notNull(),
  sourcePath: text('source_path'),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (cicdWorkflows) => ({
  uniqueExternalId: uniqueIndex('cicd_workflows_external_id_idx').on(cicdWorkflows.externalId, cicdWorkflows.repositoryId),
}));

export type CicdWorkflow = InferSelectModel<typeof cicdWorkflows>;
export type NewCicdWorkflow = InferInsertModel<typeof cicdWorkflows>;
export const CicdWorkflowSchema = createSelectSchema(cicdWorkflows, {
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
  runner: z.enum(cicdWorkflowRunnersEnum),
});
export const NewCicdWorkflowSchema = createInsertSchema(cicdWorkflows, {
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
  runner: z.enum(cicdWorkflowRunnersEnum),
});

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { sqliteTable } from './extract-table';
import { repositories } from './repositories';
import { cicdWorkflows } from './cicd-workflows';
import { Enum } from './enum-column';

const cicdRunStatusEnum = ['unknown', 'not_started', 'in_progress', 'skipped', 'cancelled', 'timed_out'] as const;
const cicdRunResultEnum = ['unknown', 'none', 'success', 'failure'] as const;

export const cicdRuns = sqliteTable('cicd_runs', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
  repositoryId: integer('repository_id').references(() => repositories.id).notNull(),
  workflowId: integer('workflow_id').references(() => cicdWorkflows.id).notNull(),
  runAttempt: integer('run_attempt').notNull(),
  detailsUrl: text('details_url'),
  gitSha: text('git_sha').notNull(),
  gitBranch: text('git_branch').notNull(),
  status: Enum('status', { enum: cicdRunStatusEnum }).notNull(),
  result: Enum('result', { enum: cicdRunResultEnum }),
  
  runStartedAt: integer('run_started_at', { mode: 'timestamp_ms' }),
  runEndedAt: integer('run_ended_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (cicdRuns) => ({
  uniqueExternalId: uniqueIndex('cicd_runs_external_id_idx').on(cicdRuns.externalId, cicdRuns.repositoryId),
}));

export type CicdRun = InferSelectModel<typeof cicdRuns>;
export type NewCicdRun = InferInsertModel<typeof cicdRuns>;
export const CicdRunSchema = createSelectSchema(cicdRuns, {
  status: z.enum(cicdRunStatusEnum),
  result: z.enum(cicdRunResultEnum),
  runStartedAt: z.coerce.date(),
  runEndedAt: z.coerce.date(),
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
});
export const NewCicdRunSchema = createInsertSchema(cicdRuns, {
  status: z.enum(cicdRunStatusEnum),
  result: z.enum(cicdRunResultEnum),
  runStartedAt: z.coerce.date(),
  runEndedAt: z.coerce.date(),
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
});

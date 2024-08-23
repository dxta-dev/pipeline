import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { repositories } from './repositories';
import { sqliteTable } from './extract-table';

export const repositoryCommits = sqliteTable('repository_commits', {
  id: integer('id').primaryKey(),
  repositoryId: integer('repository_id').references(() => repositories.id).notNull(),
  sha: text('sha').notNull(),
  committedAt: integer('committed_at', { mode: 'timestamp_ms' }),
  authoredAt: integer('authored_at', { mode: 'timestamp_ms' }),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (commits) => ({
  uniqueRepositorySha: uniqueIndex('repository_commits_repository_sha_idx').on(
    commits.repositoryId,
    commits.sha,
  ),
}),
);

export type Commit = InferSelectModel<typeof repositoryCommits>;
export type NewCommit = InferInsertModel<typeof repositoryCommits>;
export const CommitSchema = createSelectSchema(repositoryCommits, {
  authoredAt: z.coerce.date(),
  committedAt: z.coerce.date(),
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
});
export const NewCommitSchema = createInsertSchema(repositoryCommits, {
  authoredAt: z.coerce.date(),
  committedAt: z.coerce.date(),
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
});


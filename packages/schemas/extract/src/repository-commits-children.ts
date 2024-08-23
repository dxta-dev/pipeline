import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { sqliteTable } from './extract-table';
import { repositoryCommits } from './repository-commits';

export const repositoryCommitsChildren = sqliteTable('repository_commits_children', {
  commitId: integer('commit_id').references(() => repositoryCommits.id).notNull(),
  parentId: integer('parent_id').references(() => repositoryCommits.id).notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (commitsChildren) => ({
  pk: primaryKey({ columns: [commitsChildren.commitId, commitsChildren.parentId] }),
}));

export type CommitChild = InferSelectModel<typeof repositoryCommitsChildren>;
export type NewCommitChild = InferInsertModel<typeof repositoryCommitsChildren>;
export const CommitChildSchema = createSelectSchema(repositoryCommitsChildren, {
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
});
export const NewCommitChildSchema = createInsertSchema(repositoryCommitsChildren, {
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
});

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { repositories } from './repositories';
import { sqliteTable } from './extract-table';
import { repositoryCommits } from './repository-commits';

export const repositoryCommitsChildren = sqliteTable('repository_commits_children', {
  id: integer('id').primaryKey(),
  commit: integer('commit').references(() => repositoryCommits.id).notNull(),
  childOf: integer('parent').references(() => repositoryCommits.id).notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (commitsChildren) => ({
  uniqueCommitChild: uniqueIndex('repository_commits_children_idx').on(commitsChildren.commit, commitsChildren.childOf)
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

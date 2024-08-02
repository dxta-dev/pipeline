import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { repositories } from './repositories';
import { sqliteTable } from './extract-table';

export const repositoryCommits = sqliteTable('repository_commits', {
  id: integer('id').primaryKey(),
  repositoryId: integer('repository_id').references(() => repositories.id).notNull(),
  sha0: integer('sha_0').notNull(),
  sha1: integer('sha_1').notNull(),
  sha2: integer('sha_2').notNull(),
  sha3: integer('sha_3').notNull(),
  sha4: integer('sha_4').notNull(),
  committedAt: integer('committed_at').notNull(),
  authoredAt: integer('authored_at').notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (commits) => ({
  uniqueRepositorySha: uniqueIndex('repository_commits_repository_sha_idx').on(
    commits.repositoryId,
    commits.sha0,
    commits.sha1,
    commits.sha2,
    commits.sha3,
    commits.sha4,
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

export const marshalSha = (sha: string) => {
  return {
    sha0: parseInt(sha.slice(0 * 8, 1 * 8), 16),
    sha1: parseInt(sha.slice(1 * 8, 2 * 8), 16),
    sha2: parseInt(sha.slice(2 * 8, 3 * 8), 16),
    sha3: parseInt(sha.slice(3 * 8, 4 * 8), 16),
    sha4: parseInt(sha.slice(4 * 8, 5 * 8), 16),
  }
};

export const unmarshalSha = (commit: Commit) => {
  return commit.sha0.toString(16).padStart(8, "0")
    + commit.sha1.toString(16).padStart(8, "0")
    + commit.sha2.toString(16).padStart(8, "0")
    + commit.sha3.toString(16).padStart(8, "0")
    + commit.sha4.toString(16).padStart(8, "0");
};

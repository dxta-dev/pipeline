import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { repositories } from "./repositories";
import { repositoryShas } from "./repository-shas";
import { sqliteTable } from "./extract-table";

export const repositoryCommits = sqliteTable(
  "repository_commits",
  {
    id: integer("id").primaryKey(),
    repositoryId: integer("repository_id")
      .references(() => repositories.id)
      .notNull(),
    repositoryShaId: integer("repository_sha_id")
      .references(() => repositoryShas.id)
      .notNull(),
    committedAt: integer("committed_at", { mode: "timestamp_ms" }),
    authoredAt: integer("authored_at", { mode: "timestamp_ms" }),
    _createdAt: integer("__created_at", { mode: "timestamp" }).default(
      sql`(strftime('%s', 'now'))`,
    ),
    _updatedAt: integer("__updated_at", { mode: "timestamp" }).default(
      sql`(strftime('%s', 'now'))`,
    ),
  },
  (commits) => ({
    uniqueRepositorySha: uniqueIndex(
      "repository_commits_repository_sha_id_idx",
    ).on(commits.repositoryShaId),
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

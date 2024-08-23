import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from "drizzle-orm";
import { integer, uniqueIndex, text } from "drizzle-orm/sqlite-core";
import { repositories } from "./repositories";
import { sqliteTable } from './extract-table';

export const repositoryShas = sqliteTable(
  "repository_shas",
  {
    id: integer("id").primaryKey(),
    sha: text("sha").notNull(),
    repositoryId: integer("repository_id").references(() => repositories.id).notNull(),
    _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
    _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  },
  (repositorySha) => ({
    uniqueRepositoryIdSha: uniqueIndex("repository_shas_repository_id_sha_idx").on(
      repositorySha.repositoryId,
      repositorySha.sha,
    ),
  }),
);
export type Sha = InferSelectModel<typeof repositoryShas>;
export type NewSha = InferInsertModel<typeof repositoryShas>;

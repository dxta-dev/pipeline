import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { integer, primaryKey } from "drizzle-orm/sqlite-core";
import { repositories } from "./repositories";
import { members } from "./members";
import { sqliteTable } from "./extract-table";

export const repositoriesToMembers = sqliteTable(
  "repositories_to_members",
  {
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositories.id),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id),
    _createdAt: integer("__created_at", { mode: "timestamp" }).default(
      sql`(strftime('%s', 'now'))`,
    ),
    _updatedAt: integer("__updated_at", { mode: "timestamp" }).default(
      sql`(strftime('%s', 'now'))`,
    ),
  },
  (repositoriesToMembers) => ({
    pk: primaryKey(
      repositoriesToMembers.repositoryId,
      repositoriesToMembers.memberId,
    ),
  }),
);

export type RepositoryToMember = InferSelectModel<typeof repositoriesToMembers>;
export type NewRepositoryToMember = InferInsertModel<
  typeof repositoriesToMembers
>;

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { integer, primaryKey } from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { sqliteTable } from "./extract-table";
import { repositoryShas } from "./repository-shas";

export const repositoryShaTrees = sqliteTable(
  "repository_sha_trees",
  {
    shaId: integer("sha_id")
      .references(() => repositoryShas.id)
      .notNull(),
    parentId: integer("parent_id")
      .references(() => repositoryShas.id)
      .notNull(),
    _createdAt: integer("__created_at", { mode: "timestamp" }).default(
      sql`(strftime('%s', 'now'))`,
    ),
    _updatedAt: integer("__updated_at", { mode: "timestamp" }).default(
      sql`(strftime('%s', 'now'))`,
    ),
  },
  (shaTree) => ({
    pk: primaryKey({ columns: [shaTree.shaId, shaTree.parentId] }),
  }),
);

export type ShaTreeNode = InferSelectModel<typeof repositoryShaTrees>;
export type NewShaTreeNode = InferInsertModel<typeof repositoryShaTrees>;

export const ShaTreeNodeSchema = createSelectSchema(repositoryShaTrees, {
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
});

import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sqliteTable } from "./transform-table";

export const branches = sqliteTable(
  "branches",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    _createdAt: integer("__created_at", { mode: "timestamp" }).default(
      sql`(strftime('%s', 'now'))`,
    ),
    _updatedAt: integer("__updated_at", { mode: "timestamp" }).default(
      sql`(strftime('%s', 'now'))`,
    ),
  },
  (branches) => ({
    uniqueBranchIndex: uniqueIndex("branches_name_idx").on(branches.name),
  }),
);

export type Branch = InferSelectModel<typeof branches>;
export type NewBranch = InferInsertModel<typeof branches>;

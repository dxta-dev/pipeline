import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { text, integer } from "drizzle-orm/sqlite-core";
import { sqliteTable } from "./tenant-table";

export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  _createdAt: integer("__created_at", { mode: "timestamp" }).default(
    sql`(strftime('%s', 'now'))`,
  ),
  _updatedAt: integer("__updated_at", { mode: "timestamp" }).default(
    sql`(strftime('%s', 'now'))`,
  ),
});

export type Team = InferSelectModel<typeof teams>;
export type NewTeam = InferInsertModel<typeof teams>;

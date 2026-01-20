import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { Enum } from "./enum-column";
import { sqliteTable } from "./extract-table";

export const namespaces = sqliteTable(
  "namespaces",
  {
    id: integer("id").primaryKey(),
    externalId: integer("external_id").notNull(),
    forgeType: Enum("forge_type", { enum: ["github", "gitlab"] }).notNull(),
    namespaceType: Enum("namespace_type", {
      enum: ["organization", "personal"],
    })
      .notNull()
      .default(sql`0`),
    name: text("name").notNull(),
    _createdAt: integer("__created_at", { mode: "timestamp" }).default(
      sql`(strftime('%s', 'now'))`,
    ),
    _updatedAt: integer("__updated_at", { mode: "timestamp" }).default(
      sql`(strftime('%s', 'now'))`,
    ),
  },
  (namespaces) => ({
    uniqueExternalId: uniqueIndex("namespaces_external_id_idx").on(
      namespaces.externalId,
      namespaces.forgeType,
    ),
  }),
);

export type Namespace = InferSelectModel<typeof namespaces>;
export type NewNamespace = InferInsertModel<typeof namespaces>;
export const NewNamespaceSchema = createInsertSchema(namespaces, {
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
  forgeType: z.literal("github").or(z.literal("gitlab")),
  namespaceType: z.literal("organization").or(z.literal("personal")),
});
export const NamespaceSchema = createSelectSchema(namespaces, {
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
  forgeType: z.literal("github").or(z.literal("gitlab")),
  namespaceType: z.literal("organization").or(z.literal("personal")),
});

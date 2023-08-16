import type { InferModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { integer, sqliteTable, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";

export const mergeRequests = sqliteTable(
  "merge_requests",
  {
    id: integer("id").primaryKey(),
    /* Gitlab -> id */
    externalId: integer("external_id").notNull(),
    /* Gitlab -> iid, GitHub -> number */
    mergeRequestId: integer("merge_request_id").notNull(),
    repositoryId: integer("repository_id").notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  },
  (mergeRequests) => ({
    uniqueExternalId: uniqueIndex("merge_requests_external_id_idx").on(
      mergeRequests.externalId,
    ),
  }),
);

export type MergeRequest = InferModel<typeof mergeRequests>;
export type NewMergeRequest = InferModel<typeof mergeRequests, "insert">;
export const MergeRequestSchema = createInsertSchema(mergeRequests);
export const NewMergeRequestSchema = createInsertSchema(mergeRequests);

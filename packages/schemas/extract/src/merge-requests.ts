import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { integer, sqliteTable, uniqueIndex, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const mergeRequests = sqliteTable(
  "merge_requests",
  {
    id: integer("id").primaryKey(),
    /* Gitlab -> id */
    externalId: integer("external_id").notNull(),
    /* Gitlab -> iid, GitHub -> number */
    mergeRequestId: integer("merge_request_id").notNull(),
    repositoryId: integer("repository_id").notNull(),
    title: text("title").notNull(),
    webUrl: text("web_url").notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
    mergedAt: integer('merged_at', { mode: 'timestamp_ms' }),
    closedAt: integer('closed_at', { mode: 'timestamp_ms' }),
    authorExternalId: integer('author_external_id'),
    state: text('state'),
    targetBranch: text('target_branch'),
    sourceBranch: text('source_branch'),
    _createdAt: integer('__created_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
    _updatedAt: integer('__updated_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
  },
  (mergeRequests) => ({
    uniqueExternalId: uniqueIndex("merge_requests_external_id_idx").on(
      mergeRequests.externalId,
    ),
  }),
);

export type MergeRequest = InferSelectModel<typeof mergeRequests>;
export type NewMergeRequest = InferInsertModel<typeof mergeRequests>;
export const MergeRequestSchema = createSelectSchema(mergeRequests, {
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  mergedAt: z.coerce.date(),
  closedAt: z.coerce.date(),
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
});
export const NewMergeRequestSchema = createInsertSchema(mergeRequests, {
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  mergedAt: z.coerce.date(),
  closedAt: z.coerce.date(),
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
});

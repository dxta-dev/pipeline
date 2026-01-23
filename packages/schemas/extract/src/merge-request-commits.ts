import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { mergeRequests } from "./merge-requests";
import { sqliteTable } from "./extract-table";

export const mergeRequestCommits = sqliteTable(
  "merge_request_commits",
  {
    id: integer("id").primaryKey(),
    mergeRequestId: integer("merge_request_id")
      .references(() => mergeRequests.id)
      .notNull(),
    externalId: text("external_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    authoredDate: integer("authored_date", { mode: "timestamp_ms" }).notNull(),
    committedDate: integer("committed_date", {
      mode: "timestamp_ms",
    }).notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    authorName: text("author_name").notNull(),
    authorEmail: text("author_email").notNull(),
    authorExternalId: integer("author_external_id"),
    authorUsername: text("author_username"),
    committerName: text("committer_name"),
    committerEmail: text("committer_email"),
    committerExternalId: integer("committer_external_id"),
    committerUsername: text("committer_username"),
    htmlUrl: text("html_url"),
    _createdAt: integer("__created_at", { mode: "timestamp" }).default(
      sql`(strftime('%s', 'now'))`,
    ),
    _updatedAt: integer("__updated_at", { mode: "timestamp" }).default(
      sql`(strftime('%s', 'now'))`,
    ),
  },
  (commits) => ({
    uniqueExternalId: uniqueIndex("merge_request_commits_external_id_idx").on(
      commits.mergeRequestId,
      commits.externalId,
    ),
  }),
);

export type MergeRequestCommit = InferSelectModel<typeof mergeRequestCommits>;
export type NewMergeRequestCommit = InferInsertModel<
  typeof mergeRequestCommits
>;
export const MergeRequestCommitSchema = createInsertSchema(
  mergeRequestCommits,
  {
    createdAt: z.coerce.date(),
    authoredDate: z.coerce.date(),
    committedDate: z.coerce.date(),
    _createdAt: z.coerce.date(),
    _updatedAt: z.coerce.date(),
  },
);
export const NewMergeRequestCommitSchema = createInsertSchema(
  mergeRequestCommits,
  {
    createdAt: z.coerce.date(),
    authoredDate: z.coerce.date(),
    committedDate: z.coerce.date(),
    _createdAt: z.coerce.date(),
    _updatedAt: z.coerce.date(),
  },
);

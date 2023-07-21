import type { InferModel } from 'drizzle-orm';
import { sqliteTable, integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const mergeRequestCommits = sqliteTable('merge_request_commits', {
    id: integer('id').primaryKey(),
    mergeRequestId: integer('merge_request_id').notNull(),
    externalId: text('external_id').notNull(),
    createdAt: text('created_at').notNull(),
    authoredDate: text('authored_date'),
    committedDate: text('committed_date'),
    title: text('title').notNull(),
    message: text('message').notNull(),
    authorName: text('author_name').notNull(),
    authorEmail: text('author_email').notNull(),
    committerName: text('committer_name'),
    committerEmail: text('committer_email'),
}, (commits) => ({
    uniqueExternalId: uniqueIndex('merge_request_commits_external_id_idx').on(commits.externalId),
}));

export type MergeRequestCommit = InferModel<typeof mergeRequestCommits>;
export type NewMergeRequestCommit = InferModel<typeof mergeRequestCommits, 'insert'>;
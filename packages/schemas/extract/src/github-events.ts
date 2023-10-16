import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { type InferInsertModel, type InferSelectModel, sql } from 'drizzle-orm';

export const githubEvents = sqliteTable('github_events', {
  id: integer('id').primaryKey(),
  eventType: text('event_type').notNull(),
  createdAt: integer('created_at').notNull(),
  authorName: text('author_name').notNull(),
  authorEmail: text('author_email'),
  committerName: text('committer_name'),
  committerEmail: text('committer_email'),
  authorId: text('author_id'),
  assignedUserName: text('assigned_user_name'),
  assignedUserId: integer('assigned_user_id'),
  body: text('body'),
  message: text('message'),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export type GithubEvents = InferSelectModel<typeof githubEvents>;
export type NewGithubEvents = InferInsertModel<typeof githubEvents>;

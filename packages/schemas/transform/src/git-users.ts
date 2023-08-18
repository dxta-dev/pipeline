import type { InferModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const gitUsers = sqliteTable('git_users', {
  id: integer('id').primaryKey(),
  username: text('username').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
});

export type GitUser = InferModel<typeof gitUsers>;
export type NewGitUser = InferModel<typeof gitUsers, 'insert'>;

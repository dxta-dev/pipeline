import type { InferModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { gitUsers } from './git-users';
import { forgeUsers } from './forge-users';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey(),
  external_id: text('external_id').notNull(),
  gitUserId: integer('git_user_id').references(() => gitUsers.id),
  forgeUserId: integer('forge_user_id').references(() => forgeUsers.id),
  isOnboarded: integer('is_onboarded', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export type User = InferModel<typeof users>;
export type NewUser = InferModel<typeof users, 'insert'>;

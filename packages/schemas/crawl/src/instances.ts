import { sql } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const instances = sqliteTable('instances', {
  id: integer('id').primaryKey(),
  startedAt: integer('started_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  userId: text('user_id').notNull(),
  repositoryId: integer('repository_id').notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export type Instance = InferSelectModel<typeof instances>;
export type NewInstance = InferInsertModel<typeof instances>;


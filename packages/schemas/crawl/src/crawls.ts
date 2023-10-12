import { sql } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sqliteTable, integer } from 'drizzle-orm/sqlite-core';

export const crawls = sqliteTable('crawls', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  startedAt: integer('started_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  userId: integer('user_id').notNull(),
  repositoryId: integer('repository_id').notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export type Crawl = InferSelectModel<typeof crawls>;
export type NewCrawl = InferInsertModel<typeof crawls>;


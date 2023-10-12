import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { Enum } from './enum-column';
import { z } from 'zod';
import { crawls } from './crawls';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export const crawlEvents = sqliteTable('crawl_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  crawlId: integer('crawl_id').notNull().references(() => crawls.id),
  type: Enum('type',
    {
      enum:
        [
          'repository.crawlComplete',
          'repository.crawlFailed',
          'repository.crawlInfo',
          'mergeRequest.crawlComplete',
          'mergeRequest.crawlFailed',
          'mergeRequest.crawlInfo',
          'mergeRequestCommit.crawlComplete',
          'mergeRequestCommit.crawlFailed',
          'mergeRequestCommit.crawlInfo',
          'mergeRequestDiff.crawlComplete',
          'mergeRequestDiff.crawlFailed',
          'mergeRequestDiff.crawlInfo',
          'mergeRequestNote.crawlComplete',
          'mergeRequestNote.crawlFailed',
          'mergeRequestNote.crawlInfo',
          'namespace.crawlComplete',
          'namespace.crawlFailed',
          'namespace.crawlInfo',
          'member.crawlComplete',
          'member.crawlFailed',
          'member.crawlInfo',
        ]
    }
  ).notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  data: text('data', { mode: 'json' }).notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export const CrawlCompleteSchema = z.object({
  ids: z.array(z.number().int()),
  page: z.number().nonnegative().int(),
});

export const CrawlFailedSchema = z.object({
  page: z.number().nonnegative().int(),
  message: z.string().nullable(),
});

export const CrawlInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  message: z.string().nullable(),
  pages: z.number().nonnegative().int(),
});

export type CrawlEvent = InferSelectModel<typeof crawlEvents>;
export type NewCrawlEvent = InferInsertModel<typeof crawlEvents>;

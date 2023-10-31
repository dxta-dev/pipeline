import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { Enum } from './enum-column';
import { z } from 'zod';
import { instances } from './instances';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';


const eventDetails = [
  'crawlComplete',
  'crawlFailed',
  'crawlInfo',
] as const;

const [detailType, ...detailTypeRest] = eventDetails;

export type EventDetailType = typeof eventDetails[number];

const eventNamespaces = [
  'repository',
  'mergeRequest',
  'mergeRequestCommit',
  'mergeRequestDiff',
  'mergeRequestNote',
  'member',
  'memberInfo',
] as const;

const [namespaceType, ...nammespaceTypeRest] = eventNamespaces;

export type EventNamespaceType = typeof eventNamespaces[number];

export const events = sqliteTable('events', {
  id: integer('id').primaryKey(),
  crawlId: integer('instance_id').notNull().references(() => instances.id),
  namespace: Enum('namespace',
    {
      enum: [namespaceType as string, ...nammespaceTypeRest],
    }
  ).notNull(),
  detail: Enum('detail',
    {
      enum: [detailType as string, ...detailTypeRest],
    }
  ).notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  data: text('data', { mode: 'json' }).notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export const CrawlCompleteSchema = z.object({
});

export const CrawlFailedSchema = z.object({
  message: z.string().nullable(),
});

export const CrawlInfoSchema = z.object({
  calls: z.number().nonnegative().int(),
});

export type CrawlComplete = z.infer<typeof CrawlCompleteSchema>;
export type CrawlFailed = z.infer<typeof CrawlFailedSchema>;
export type CrawlInfo = z.infer<typeof CrawlInfoSchema>;

export type Event = InferSelectModel<typeof events>;
export type NewEvent = InferInsertModel<typeof events>;

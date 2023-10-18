import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { type InferInsertModel, type InferSelectModel, sql } from 'drizzle-orm';
import { z } from 'zod';
import { Enum } from './enum-column';

export const timelineEvents = sqliteTable('timeline_events', {
  id: integer('id').primaryKey(),
  external_id: integer('external_id').notNull(),
  type: Enum('type',
    {
      enum:
        [
          'assigned',
        ]
    }
  ).notNull(),
  mergeRequestId: integer('merge_request_id').notNull(),
  eventType: text('event_type').notNull(),
  timestamp: integer('timestamp').notNull(),
  actorId: integer('actor_id').notNull(),
  actorName: text('actor_name').notNull(),
  actorEmail: text('actor_email'),
  data: text('data', { mode: 'json' }).notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});


export const AssignedEventSchema = z.object({
  assignee: z.object({
    id: z.number(),
    name: z.string(),
  }),
});

export type AssingedEvent = z.infer<typeof AssignedEventSchema>;

export type TimelineEvents = InferSelectModel<typeof timelineEvents>;
export type NewTimelineEvents = InferInsertModel<typeof timelineEvents>;

import type { InferModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { sqliteTable, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const dates = sqliteTable('dates', {
  id: integer('id').primaryKey(),
  day: integer('day').notNull(),
  week: integer('week').notNull(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
}, (dates) => ({
  uniqueDateIndex: uniqueIndex('dates_day_week_month_year_idx').on(dates.day, dates.week, dates.month, dates.year)
}));

export type Date = InferModel<typeof dates>;
export type NewDate = InferModel<typeof dates, 'insert'>;
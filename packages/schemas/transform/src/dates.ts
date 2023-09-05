import type { InferModel } from 'drizzle-orm';
import { sqliteTable, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const dates = sqliteTable('dates', {
  id: integer('id').primaryKey(),
  day: integer('day'),
  week: integer('day'),
  month: integer('day'),
  year: integer('day'),
}, (dates) => ({
  uniqueDateIndex: uniqueIndex('dates_day_week_month_year_idx').on(dates.day, dates.week, dates.month, dates.year)
}));

export type Date = InferModel<typeof dates>;
export type NewDate = InferModel<typeof dates, 'insert'>;
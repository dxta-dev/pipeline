import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sqliteTable } from "./transform-table";

export const dates = sqliteTable(
  "dates",
  {
    id: integer("id").primaryKey(),
    day: integer("day").notNull(),
    week: text("week").notNull(),
    month: integer("month").notNull(),
    year: integer("year").notNull(),

    _createdAt: integer("__created_at", { mode: "timestamp" }).default(
      sql`(strftime('%s', 'now'))`,
    ),
    _updatedAt: integer("__updated_at", { mode: "timestamp" }).default(
      sql`(strftime('%s', 'now'))`,
    ),
  },
  (dates) => ({
    uniqueDateIndex: uniqueIndex("dates_day_week_month_year_idx").on(
      dates.day,
      dates.week,
      dates.month,
      dates.year,
    ),
    datesWeekIndex: index("dates_week_idx").on(dates.week),
  }),
);

export type TransformDate = InferSelectModel<typeof dates>;
export type NewTransformDate = InferInsertModel<typeof dates>;

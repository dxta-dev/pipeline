import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { integer, uniqueIndex  } from 'drizzle-orm/sqlite-core';
import { sqliteTable } from './transform-table';

export const nullRows = sqliteTable('null_rows', {
  id: integer('id').primaryKey(),
  dateId: integer('dates_id').notNull(),
  userId: integer('users_id').notNull(),
  mergeRequestId: integer('merge_requests_id').notNull(),
  repositoryId: integer('repository_id').notNull(),
  branchId: integer('branch_id').notNull().default(1),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (nullRows)=>({
  uniqueValuesIdx: uniqueIndex("null_rows_unique_values_idx").on(
    nullRows.dateId,
    nullRows.userId,
    nullRows.mergeRequestId,
    nullRows.repositoryId,
    nullRows.branchId
  )
}));

export type NullRows = InferSelectModel<typeof nullRows>;
export type NewNullRows = InferInsertModel<typeof nullRows>;

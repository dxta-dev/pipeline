import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { integer } from 'drizzle-orm/sqlite-core';
import { forgeUsers } from './forge-users';
import { sqliteTable } from './transform-table';

export const mergeRequestUsersJunk = sqliteTable('merge_request_fact_users_junk', {
  id: integer('id').primaryKey(),

  author: integer('author').notNull().references(() => forgeUsers.id),
  mergedBy: integer('merged_by').notNull().references(() => forgeUsers.id),
  approver1: integer('approver1').notNull().references(() => forgeUsers.id),
  approver2: integer('approver2').notNull().references(() => forgeUsers.id),
  approver3: integer('approver3').notNull().references(() => forgeUsers.id),
  approver4: integer('approver4').notNull().references(() => forgeUsers.id),
  approver5: integer('approver5').notNull().references(() => forgeUsers.id),
  approver6: integer('approver6').notNull().references(() => forgeUsers.id),
  approver7: integer('approver7').notNull().references(() => forgeUsers.id),
  approver8: integer('approver8').notNull().references(() => forgeUsers.id),
  approver9: integer('approver9').notNull().references(() => forgeUsers.id),
  approver10: integer('approver10').notNull().references(() => forgeUsers.id),
  committer1: integer('committer1').notNull().references(() => forgeUsers.id),
  committer2: integer('committer2').notNull().references(() => forgeUsers.id),
  committer3: integer('committer3').notNull().references(() => forgeUsers.id),
  committer4: integer('committer4').notNull().references(() => forgeUsers.id),
  committer5: integer('committer5').notNull().references(() => forgeUsers.id),
  committer6: integer('committer6').notNull().references(() => forgeUsers.id),
  committer7: integer('committer7').notNull().references(() => forgeUsers.id),
  committer8: integer('committer8').notNull().references(() => forgeUsers.id),
  committer9: integer('committer9').notNull().references(() => forgeUsers.id),
  committer10: integer('committer10').notNull().references(() => forgeUsers.id),
  reviewer1: integer('reviewer1').notNull().references(() => forgeUsers.id),
  reviewer2: integer('reviewer2').notNull().references(() => forgeUsers.id),
  reviewer3: integer('reviewer3').notNull().references(() => forgeUsers.id),
  reviewer4: integer('reviewer4').notNull().references(() => forgeUsers.id),
  reviewer5: integer('reviewer5').notNull().references(() => forgeUsers.id),
  reviewer6: integer('reviewer6').notNull().references(() => forgeUsers.id),
  reviewer7: integer('reviewer7').notNull().references(() => forgeUsers.id),
  reviewer8: integer('reviewer8').notNull().references(() => forgeUsers.id),
  reviewer9: integer('reviewer9').notNull().references(() => forgeUsers.id),
  reviewer10: integer('reviewer10').notNull().references(() => forgeUsers.id),

  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export type MergeRequestUsersJunk = InferSelectModel<typeof mergeRequestUsersJunk>;
export type NewMergeRequestUsersJunk = InferInsertModel<typeof mergeRequestUsersJunk>;

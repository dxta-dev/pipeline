import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sqliteTable, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const repositoriesToMembers = sqliteTable('repositories_to_members', {
  repositoryId: integer('repository_id').notNull(),
  memberId: integer('member_id').notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
  _updatedAt: integer('__updated_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
}, (repositoriesToMembers) => ({
  pk: primaryKey(repositoriesToMembers.repositoryId, repositoriesToMembers.memberId)
}));

export type RepositoryToMember = InferSelectModel<typeof repositoriesToMembers>;
export type NewRepositoryToMember = InferInsertModel<typeof repositoriesToMembers>;

import type { InferModel } from 'drizzle-orm';
import { sqliteTable, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const repositoriesToMembers = sqliteTable('repositories_to_members', {
  repositoryId: integer('repository_id').notNull(),
  memberId: integer('member_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
}, (repositoriesToMembers) => ({
  pk: primaryKey(repositoriesToMembers.repositoryId, repositoriesToMembers.memberId)
}));

export type RepositoryToMember = InferModel<typeof repositoriesToMembers>;
export type NewRepositoryToMember = InferModel<typeof repositoriesToMembers, 'insert'>;

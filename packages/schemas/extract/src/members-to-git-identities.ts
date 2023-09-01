import type { InferModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { sqliteTable, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const membersToGitIdentities = sqliteTable('repositories_to_members', {
  memberId: integer('member_id').notNull(),
  gitIdentityId: integer('git_identity_id').notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
}, (membersToGitIdentities) => ({
  pk: primaryKey(membersToGitIdentities.memberId, membersToGitIdentities.gitIdentityId)
}));

export type MembersToGitIdentities = InferModel<typeof membersToGitIdentities>;
export type NewMembersToGitIdentities = InferModel<typeof membersToGitIdentities, 'insert'>;

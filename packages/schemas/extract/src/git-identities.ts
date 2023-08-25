import type { InferModel } from "drizzle-orm";
import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const gitIdentities = sqliteTable('git_identities', {
    memberId: integer('member_id').notNull(),
    authorEmail: text('author_email').notNull(), // -> ToDo -> check for adding repo_id
    _createdAt: integer('__created_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
    _updatedAt: integer('__updated_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
  }, (gitIdentities) => ({
    pk: primaryKey(gitIdentities.memberId, gitIdentities.authorEmail)
  }));
    
  export type GitlabIdentities = InferModel<typeof gitIdentities>;
  export type NewGitlabIdentities = InferModel<typeof gitIdentities, 'insert'>;
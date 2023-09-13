import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const gitIdentities = sqliteTable('git_identities', {
    id: integer('id').primaryKey(),
    repositoryId: integer('repository_id').notNull(),
    email: text('email').notNull(), 
    name: text('name').notNull(),
    _createdAt: integer('__created_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
    _updatedAt: integer('__updated_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
  }, (gitIdentities) => ({
    uniqueRepositoryIdEmailName: uniqueIndex('repository_id_email_name_idx').on(gitIdentities.repositoryId, gitIdentities.email, gitIdentities.name),
  }));
    
  export type GitIdentities = InferSelectModel<typeof gitIdentities>;
  export type NewGitIdentities = InferInsertModel<typeof gitIdentities>;
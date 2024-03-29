import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { Enum } from './enum-column';
import { sqliteTable } from './extract-table';

export const members = sqliteTable('members', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
  forgeType: Enum('forge_type', { enum: ['github', 'gitlab'] }).notNull(),
  name: text('name'),
  username: text('username').notNull(),
  email: text('email'),
  profileUrl: text('profile_url').default(''),
  avatarUrl: text('avatar_url').default(''),
  extractedSource: Enum('extracted_source', { enum: ['repository', 'namespace', 'notes', 'timeline', 'commit'] }),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _extractedAt: integer('__extracted_at', { mode: 'timestamp' }),
}, (members) => ({
  uniqueExternalId: uniqueIndex('members_external_id_idx').on(members.externalId, members.forgeType),
}));

export type Member = InferSelectModel<typeof members>;
export type NewMember = InferInsertModel<typeof members>;
export const MemberSchema = createSelectSchema(members, {
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
  forgeType: z.literal('github').or(z.literal('gitlab')),
});
export const NewMemberSchema = createInsertSchema(members, {
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
  forgeType: z.literal('github').or(z.literal('gitlab')),
});

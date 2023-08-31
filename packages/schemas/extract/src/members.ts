import type { InferModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const members = sqliteTable('members', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
  name: text('name'),
  username: text('username').notNull(),
  email: text('email'),
  _createdAt: integer('__created_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
}, (members) => ({
  uniqueGitlabId: uniqueIndex('members_external_id_idx').on(members.externalId),
}));

export type Member = InferModel<typeof members>;
export type NewMember = InferModel<typeof members, 'insert'>;
export const MemberSchema = createSelectSchema(members, {
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
});
export const NewMemberSchema = createInsertSchema(members, {
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
});

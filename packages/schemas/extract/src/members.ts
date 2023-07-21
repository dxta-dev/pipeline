import type { InferModel } from 'drizzle-orm';
import { sqliteTable, integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const members = sqliteTable('members', {
    id: integer('id').primaryKey(),
    externalId: integer('external_id').notNull(),
    name: text('name').notNull(),
    username: text('username').notNull(),
}, (members) => ({
    uniqueExternalId: uniqueIndex('members_external_id_idx').on(members.externalId),
}));

export type Member = InferModel<typeof members>;
export type NewMember = InferModel<typeof members, 'insert'>;
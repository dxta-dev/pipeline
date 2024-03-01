import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sqliteTable } from './user-table';
import { teams } from './teams';

export const teamMembers = sqliteTable('team_members', {
  id: integer('id').primaryKey(),
  team: integer('team').notNull().references(() => teams.id),
  member: integer('member').notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (teamMembers) => ({
  uniqueMembership: uniqueIndex('team_members_unique_idx').on(teamMembers.team, teamMembers.member),
}));

export type TeamMember = InferSelectModel<typeof teamMembers>;
export type NewTeamMember = InferInsertModel<typeof teamMembers>;

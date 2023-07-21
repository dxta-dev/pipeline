import type { InferModel } from 'drizzle-orm';
import { sqliteTable, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const projectsToMembers = sqliteTable('projects_to_members', {
    projectId: integer('project_id').notNull(),
    memberId: integer('member_id').notNull(),
}, (projectsToMembers) => ({
    pk: primaryKey(projectsToMembers.projectId, projectsToMembers.memberId)
}));

export type ProjectToMember = InferModel<typeof projectsToMembers>;
export type NewProjectToMember = InferModel<typeof projectsToMembers, 'insert'>;
import type { InferModel } from 'drizzle-orm';
import { sqliteTable, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const projectsToMembers = sqliteTable('projects_to_members', {
    projectId: integer('project_id').notNull(),
    memberId: integer('member_id').notNull(),
}, (projectsToMembers) => ({
    pk: primaryKey(projectsToMembers.projectId, projectsToMembers.memberId)
}));

export type ProjectsToMembers = InferModel<typeof projectsToMembers>;
export type NewProjectToMembers = InferModel<typeof projectsToMembers, 'insert'>;
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { Enum } from './enum-column';

export const namespaces = sqliteTable('namespaces', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
  forgeType: Enum('forge_type', { enum: ['github', 'gitlab'] }).notNull(),
  name: text('name').notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
  _updatedAt: integer('__updated_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
}, (namespaces) => ({
  uniqueExternalId: uniqueIndex('namespaces_external_id_idx').on(namespaces.externalId, namespaces.forgeType),
}));

export type Namespace = InferSelectModel<typeof namespaces>;
export type NewNamespace = InferInsertModel<typeof namespaces>;
export const NewNamespaceSchema = createInsertSchema(namespaces, {
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
  forgeType: z.literal('github').or(z.literal('gitlab')),
});
export const NamespaceSchema = createSelectSchema(namespaces, {
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
  forgeType: z.literal('github').or(z.literal('gitlab')),
});

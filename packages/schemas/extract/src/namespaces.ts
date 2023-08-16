import type { InferModel } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const namespaces = sqliteTable('namespaces', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
}, (namespaces) => ({
  uniqueExternalId: uniqueIndex('namespaces_external_id_idx').on(namespaces.externalId),
}));

export type Namespace = InferModel<typeof namespaces>;
export type NewNamespace = InferModel<typeof namespaces, 'insert'>;
export const NewNamespaceSchema = createInsertSchema(namespaces);
export const NamespaceSchema = createSelectSchema(namespaces);

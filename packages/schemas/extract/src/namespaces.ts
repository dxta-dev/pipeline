import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const namespaces = sqliteTable('namespaces', {
  id: integer('id').primaryKey(),
  externalId: integer('external_id').notNull(),
  name: text('name').notNull(),
  _createdAt: integer('__created_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
  _updatedAt: integer('__updated_at', { mode: 'timestamp_ms' }).default(sql`CURRENT_TIMESTAMP`),
}, (namespaces) => ({
  uniqueExternalId: uniqueIndex('namespaces_external_id_idx').on(namespaces.externalId),
}));

export type Namespace = InferSelectModel<typeof namespaces>;
export type NewNamespace = InferInsertModel<typeof namespaces>;
export const NewNamespaceSchema = createInsertSchema(namespaces, {
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
});
export const NamespaceSchema = createSelectSchema(namespaces, {
  _createdAt: z.coerce.date(),
  _updatedAt: z.coerce.date(),
});

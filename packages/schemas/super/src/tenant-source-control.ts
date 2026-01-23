import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { and, eq, sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const tenantSourceControl = sqliteTable(
  "tenant_source_control",
  {
    id: integer("id").primaryKey(),
    tenantId: integer("tenant_id").notNull(),
    provider: text("provider").notNull(),
    githubInstallationId: integer("github_installation_id"),
    _createdAt: integer("__created_at", { mode: "timestamp" }).default(
      sql`(strftime('%s', 'now'))`,
    ),
    _updatedAt: integer("__updated_at", { mode: "timestamp" }).default(
      sql`(strftime('%s', 'now'))`,
    ),
  },
  (table) => ({
    tenantProviderIndex: uniqueIndex(
      "tenant_source_control_tenant_provider_idx",
    ).on(table.tenantId, table.provider),
  }),
);

export type TenantSourceControl = InferSelectModel<typeof tenantSourceControl>;
export type NewTenantSourceControl = InferInsertModel<
  typeof tenantSourceControl
>;

export const getTenantSourceControl = async (
  db: LibSQLDatabase,
  tenantId: number,
  provider: "github",
) =>
  db
    .select()
    .from(tenantSourceControl)
    .where(
      and(
        eq(tenantSourceControl.tenantId, tenantId),
        eq(tenantSourceControl.provider, provider),
      ),
    )
    .get();

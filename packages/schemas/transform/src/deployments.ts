import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sqliteTable } from "./transform-table";
import { repositories } from "./repositories";
import { Enum } from "./enum-column";
import { dates } from "./dates";

// Copied as is from ./packages/schemas/extract/src/deployments.ts
export const deploymentsStatusEnum = [
  "unknown",
  "pending",
  "success",
  "failure",
] as const;
export const deploymentTypeEnum = [
  "github-deployment",
  "github-workflow-deployment",
] as const;

export const deployments = sqliteTable(
  "deployments",
  {
    id: integer("id").primaryKey(),
    externalId: integer("external_id").notNull(),
    deploymentType: Enum("deployment_type", {
      enum: deploymentTypeEnum,
    }).notNull(),

    repositoryId: integer("repository_id")
      .references(() => repositories.id)
      .notNull(),

    status: Enum("status", { enum: deploymentsStatusEnum }),
    deployedAt: integer("deployed_at")
      .notNull()
      .references(() => dates.id),

    _createdAt: integer("__created_at", { mode: "timestamp" }).default(
      sql`(strftime('%s', 'now'))`,
    ),
    _updatedAt: integer("__updated_at", { mode: "timestamp" }).default(
      sql`(strftime('%s', 'now'))`,
    ),
  },
  (deployments) => ({
    uniqueExternalId: uniqueIndex("t_deployments_external_id_type_idx").on(
      deployments.externalId,
      deployments.repositoryId,
      deployments.deploymentType,
    ),
  }),
);

export type Deployment = InferSelectModel<typeof deployments>;
export type NewDeployment = InferInsertModel<typeof deployments>;

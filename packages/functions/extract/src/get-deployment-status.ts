import type { Deployment, Namespace, Repository } from "@dxta/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { SourceControl } from "@dxta/source-control";
import { eq, sql } from "drizzle-orm";

export type GetDeploymentStatusInput = {
  repository: Repository;
  namespace: Namespace;
  deployment: Deployment;
};

export type GetDeploymentStatusOutput = void;

export type GetDeploymentStatusSourceControl = Pick<
  SourceControl,
  "fetchDeployment"
>;
export type GetDeploymentStatusEntities = Pick<Entities, "deployments">;

export type GetDeploymentStatusFunction = ExtractFunction<
  GetDeploymentStatusInput,
  GetDeploymentStatusOutput,
  GetDeploymentStatusSourceControl,
  GetDeploymentStatusEntities
>;

export const getDeploymentStatus: GetDeploymentStatusFunction = async (
  { namespace, repository, deployment },
  { db, entities, integrations },
) => {
  if (!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }
  const { deployment: upToDateDeployment } =
    await integrations.sourceControl.fetchDeployment(
      repository,
      namespace,
      deployment,
    );

  await db
    .update(entities.deployments)
    .set({
      status: upToDateDeployment.status,
      updatedAt: upToDateDeployment.updatedAt,
      deployedAt: upToDateDeployment.deployedAt,
      _updatedAt: sql`(strftime('%s', 'now'))`,
    })
    .where(eq(entities.deployments.id, upToDateDeployment.id))
    .run();
};

import type { Deployment, Namespace, Repository } from "@dxta/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { SourceControl } from "@dxta/source-control";
import { eq, sql } from "drizzle-orm";

export type GetWorkflowDeploymentStatusInput = {
  repository: Repository;
  namespace: Namespace;
  deployment: Deployment;
};

export type GetWorkflowDeploymentStatusOutput = void;

export type GetWorkflowDeploymentStatusSourceControl = Pick<SourceControl, 'fetchWorkflowDeployment'>;
export type GetWorkflowDeploymentStatusEntities = Pick<Entities, 'deployments'>;

export type GetWorkflowDeploymentStatusFunction = ExtractFunction<GetWorkflowDeploymentStatusInput, GetWorkflowDeploymentStatusOutput, GetWorkflowDeploymentStatusSourceControl, GetWorkflowDeploymentStatusEntities>;

export const getWorkflowDeploymentStatus: GetWorkflowDeploymentStatusFunction = async (
  { namespace, repository, deployment },
  { db, entities, integrations }
) => {
  if (!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }
  const { deployment: upToDateDeployment } = await integrations.sourceControl.fetchWorkflowDeployment(repository, namespace, deployment);

  await db.update(entities.deployments).set({
    status: upToDateDeployment.status,
    updatedAt: upToDateDeployment.updatedAt,
    deployedAt: upToDateDeployment.deployedAt,
    _updatedAt: sql`(strftime('%s', 'now'))`,
  }).where(eq(entities.deployments.id, upToDateDeployment.id)).run();

};
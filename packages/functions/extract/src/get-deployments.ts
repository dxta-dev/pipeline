import type { Deployment } from "@dxta/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { Pagination, SourceControl } from "@dxta/source-control";
import { sql } from "drizzle-orm";

export type GetDeploymentsInput = {
  externalRepositoryId: number;
  namespaceName: string;
  repositoryName: string;
  repositoryId: number;
  page?: number;
  perPage: number;
};

export type GetDeploymentsOutput = {
  deployments: Deployment[];
  paginationInfo: Pagination;
};

export type GetDeploymentsSourceControl = Pick<SourceControl, "fetchDeployments">;
export type GetDeploymentsEntities = Pick<Entities, "deployments">;

export type GetDeploymentsFunction = ExtractFunction<GetDeploymentsInput, GetDeploymentsOutput, GetDeploymentsSourceControl, GetDeploymentsEntities>;

export const getDeployments: GetDeploymentsFunction = async (
  { externalRepositoryId, namespaceName, repositoryName, repositoryId, perPage, page },
  { integrations, db, entities }
) => {

  if (!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }

  const { deployments, pagination } = await integrations.sourceControl.fetchDeployments(externalRepositoryId, namespaceName, repositoryName, repositoryId, perPage, page);

  const insertedDeployments = await db.transaction(async (tx) => {
    return Promise.all(deployments.map(deployment =>
      tx.insert(entities.deployments).values(deployment)
        .onConflictDoUpdate({
          target: [
            entities.deployments.externalId,
            entities.deployments.repositoryId,
          ],
          set: {
            updatedAt: deployment.updatedAt,
            env: deployment.env,
            ref: deployment.ref,
            sha: deployment.sha,
            isMarkedAsProd: deployment.isMarkedAsProd,
            url: deployment.url,
            createdAt: deployment.createdAt,
            _updatedAt: sql`(strftime('%s', 'now'))`,
          },
        })
        .returning()
        .get()
    ))
  });

  return {
    deployments: insertedDeployments,
    paginationInfo: pagination
  };
};

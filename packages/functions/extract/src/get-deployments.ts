import type { Deployment, Namespace, Repository, Sha } from "@dxta/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { Pagination, SourceControl } from "@dxta/source-control";
import { sql } from "drizzle-orm";

export type GetDeploymentsInput = {
  repository: Repository;
  namespace: Namespace;
  environment?: string;
  page?: number;
  perPage: number;
};

export type GetDeploymentsOutput = {
  deployments: Deployment[];
  paginationInfo: Pagination;
};

export type GetDeploymentsSourceControl = Pick<SourceControl, "fetchDeployments">;
export type GetDeploymentsEntities = Pick<Entities, "deployments" | "repositoryShas">;

export type GetDeploymentsFunction = ExtractFunction<GetDeploymentsInput, GetDeploymentsOutput, GetDeploymentsSourceControl, GetDeploymentsEntities>;

export const getDeployments: GetDeploymentsFunction = async (
  { repository, namespace, environment, perPage, page },
  { integrations, db, entities }
) => {

  if (!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }

  const { deployments, pagination } = await integrations.sourceControl.fetchDeployments(repository, namespace, perPage, environment, page);

  const insertedShas = await db.transaction(async (tx)=> {
    return Promise.all(
      deployments.map(deployment=>
        tx.insert(entities.repositoryShas).values({ repositoryId: repository.id, sha: deployment.commitSha })
          .onConflictDoUpdate({
            target: [entities.repositoryShas.repositoryId, entities.repositoryShas.sha],
            set: { _updatedAt: sql`(strftime('%s', 'now'))` },
          })
          .returning()
          .get()
      )
    );
  });

  const shaIdMap = insertedShas.reduce((map, sha) => map.set(sha.sha, sha.id), new Map<string, Sha['id']>());

  const insertedDeployments = await db.transaction(async (tx) => {
    return Promise.all(deployments.map(deployment =>
      tx.insert(entities.deployments).values({
        externalId: deployment.externalId,
        repositoryId: deployment.repositoryId,
        environment: deployment.environment,
        status: deployment.status,
        repositoryShaId: shaIdMap.get(deployment.commitSha) as number,
        deploymentType: 'github-deployment',        
        createdAt: deployment.createdAt,
        updatedAt: deployment.updatedAt,
        deployedAt: deployment.deployedAt,
      })
        .onConflictDoUpdate({
          target: [
            entities.deployments.externalId,
            entities.deployments.repositoryId,
          ],
          set: {
            updatedAt: deployment.updatedAt,
            environment: deployment.environment,
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
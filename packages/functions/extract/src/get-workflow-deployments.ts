import type {
  Deployment,
  Namespace,
  Repository,
  Sha,
} from "@dxta/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type {
  Pagination,
  SourceControl,
  TimePeriod,
} from "@dxta/source-control";
import { sql } from "drizzle-orm";

export type GetWorkflowDeploymentsInput = {
  namespace: Namespace;
  repository: Repository;
  workflowId: number;
  timePeriod: TimePeriod;
  branch?: string;
  page?: number;
  perPage: number;
};

export type GetWorkflowDeploymentsOutput = {
  deployments: Deployment[];
  paginationInfo: Pagination;
};

export type GetWorkflowDeploymentsSourceControl = Pick<
  SourceControl,
  "fetchWorkflowDeployments"
>;
export type GetWorkflowDeploymentsEntities = Pick<
  Entities,
  "deployments" | "repositoryShas"
>;

export type GetWorkflowDeploymentsFunction = ExtractFunction<
  GetWorkflowDeploymentsInput,
  GetWorkflowDeploymentsOutput,
  GetWorkflowDeploymentsSourceControl,
  GetWorkflowDeploymentsEntities
>;

export const getWorkflowDeployments: GetWorkflowDeploymentsFunction = async (
  { namespace, repository, workflowId, perPage, page, timePeriod, branch },
  { db, entities, integrations },
) => {
  if (!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }

  const { deployments, pagination: paginationInfo } =
    await integrations.sourceControl.fetchWorkflowDeployments(
      repository,
      namespace,
      workflowId,
      timePeriod,
      perPage,
      branch,
      page,
    );

  if (deployments.length === 0 && paginationInfo.totalPages === 1)
    return {
      deployments: [],
      paginationInfo,
    };

  const insertedShas = await db.transaction(async (tx) => {
    return Promise.all(
      deployments.map((deployment) =>
        tx
          .insert(entities.repositoryShas)
          .values({ repositoryId: repository.id, sha: deployment.commitSha })
          .onConflictDoUpdate({
            target: [
              entities.repositoryShas.repositoryId,
              entities.repositoryShas.sha,
            ],
            set: { _updatedAt: sql`(strftime('%s', 'now'))` },
          })
          .returning()
          .get(),
      ),
    );
  });

  const shaIdMap = insertedShas.reduce(
    (map, sha) => map.set(sha.sha, sha.id),
    new Map<string, Sha["id"]>(),
  );

  const insertedDeployments = await db.transaction(async (tx) => {
    return Promise.all(
      deployments.map((deployment) =>
        tx
          .insert(entities.deployments)
          .values({
            externalId: deployment.externalId,
            repositoryId: deployment.repositoryId,
            environment: deployment.environment,
            status: deployment.status,
            repositoryShaId: shaIdMap.get(deployment.commitSha) as number,
            deploymentType: deployment.deploymentType,
            gitBranch: deployment.gitBranch,
            createdAt: deployment.createdAt,
            updatedAt: deployment.updatedAt,
            deployedAt: deployment.deployedAt,
          })
          .onConflictDoUpdate({
            target: [
              entities.deployments.externalId,
              entities.deployments.repositoryId,
              entities.deployments.deploymentType,
            ],
            set: {
              updatedAt: deployment.updatedAt,
              environment: deployment.environment,
              createdAt: deployment.createdAt,
              _updatedAt: sql`(strftime('%s', 'now'))`,
            },
          })
          .returning()
          .get(),
      ),
    );
  });

  return {
    deployments: insertedDeployments,
    paginationInfo,
  };
};

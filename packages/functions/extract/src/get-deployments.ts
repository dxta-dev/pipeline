import type { Deployment, Namespace, Repository, NewCommit, Commit } from "@dxta/extract-schema";
import { marshalSha, unmarshalSha } from "@dxta/extract-schema";
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
export type GetDeploymentsEntities = Pick<Entities, "deployments" | "commits">;

export type GetDeploymentsFunction = ExtractFunction<GetDeploymentsInput, GetDeploymentsOutput, GetDeploymentsSourceControl, GetDeploymentsEntities>;

export const getDeployments: GetDeploymentsFunction = async (
  { repository, namespace, environment, perPage, page },
  { integrations, db, entities }
) => {

  if (!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }

  const { deployments, pagination } = await integrations.sourceControl.fetchDeployments(repository, namespace, perPage, environment, page);

  const deploymentCommits = deployments.map(x => ({
    repositoryId: repository.id,
    ...marshalSha(x.commitSha)
  } satisfies NewCommit));

  const insertedCommits = await db.transaction(async (tx) => {
    return Promise.all(
      deploymentCommits.map(commit =>
        tx.insert(entities.commits).values(commit)
          .onConflictDoUpdate({
            target: [
              entities.commits.repositoryId,
              entities.commits.sha0,
              entities.commits.sha1,
              entities.commits.sha2,
              entities.commits.sha3,
              entities.commits.sha4,
            ],
            set: {
              _updatedAt: sql`(strftime('%s', 'now'))`,
            }
          })
          .returning()
          .get()
      )
    );
  });
  const commitShaIdMap = insertedCommits.reduce((map, commit) => map.set(unmarshalSha(commit), commit.id), new Map<string, Commit['id']>())

  const insertedDeployments = await db.transaction(async (tx) => {
    return Promise.all(deployments.map(deployment =>
      tx.insert(entities.deployments).values({
        externalId: deployment.externalId,
        repositoryId: deployment.repositoryId,
        environment: deployment.environment,
        status: deployment.status,
        commitId: commitShaIdMap.get(deployment.commitSha) as number,
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
            commitId: commitShaIdMap.get(deployment.commitSha),
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
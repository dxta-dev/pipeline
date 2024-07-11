import type { CicdWorkflow, Namespace, Repository } from "@dxta/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { Pagination, SourceControl } from "@dxta/source-control";
import { sql } from "drizzle-orm";

export type GetCicdWorkflowsInput = {
  namespace: Namespace;
  repository: Repository;
  page?: number;
  perPage: number;
};

export type GetCicdWorkflowsOutput = {
  cicdWorkflows: CicdWorkflow[];
  paginationInfo: Pagination;
};

export type GetCicdWorkflowsSourceControl = Pick<SourceControl, 'fetchCicdWorkflows'>;
export type GetCicdWorkflowsEntities = Pick<Entities, 'cicdWorkflows' | 'namespaces' | 'repositories'>;

export type GetCicdWorkflowsFunction = ExtractFunction<GetCicdWorkflowsInput, GetCicdWorkflowsOutput, GetCicdWorkflowsSourceControl, GetCicdWorkflowsEntities>;

export const getCicdWorkflows: GetCicdWorkflowsFunction = async (
  { namespace, repository, perPage, page },
  { db, entities, integrations }
) => {

  if (!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }

  const { cicdWorkflows, pagination: paginationInfo } = await integrations.sourceControl.fetchCicdWorkflows(repository, namespace, perPage, page);

  const insertedWorkflows = await db.transaction(async (tx) => {
    return Promise.all(cicdWorkflows.map(workflow =>
      tx.insert(entities.cicdWorkflows).values(workflow)
        .onConflictDoUpdate({
          target: [entities.cicdWorkflows.externalId, entities.cicdWorkflows.runner, entities.cicdWorkflows.repositoryId],
          set: {
            _updatedAt: sql`(strftime('%s', 'now'))`,
            name: workflow.name,
            sourcePath: workflow.sourcePath,
          }
        })
        .returning()
        .get()
    ));
  });

  return {
    cicdWorkflows: insertedWorkflows,
    paginationInfo
  }
}
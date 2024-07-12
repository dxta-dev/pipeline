import type { CicdRun, Namespace, Repository } from "@dxta/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { SourceControl, TimePeriod } from "@dxta/source-control";
import { sql } from "drizzle-orm";

export type GetCicdRunsInput = {
  namespace: Namespace;
  repository: Repository;
  workflowId: number;
  timePeriod: TimePeriod;
  page?: number;
  perPage: number;
};

export type GetCicdRunsOutput = {
  cicdRuns: CicdRun[];
  nextPage: number | null;
};

export type GetCicdRunsSourceControl = Pick<SourceControl, 'fetchCicdWorkflowRuns'>;
export type GetCicdRunsEntities = Pick<Entities, 'cicdRuns'>;

export type GetCicdRunsFunction = ExtractFunction<GetCicdRunsInput, GetCicdRunsOutput, GetCicdRunsSourceControl, GetCicdRunsEntities>;

export const getCicdRuns: GetCicdRunsFunction = async (
  { namespace, repository, workflowId, perPage, page, timePeriod },
  { db, entities, integrations }
) => {

  if (!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }

  const { cicdRuns, pagination: paginationInfo } = await integrations.sourceControl.fetchCicdWorkflowRuns(repository, namespace, workflowId, timePeriod, perPage, page);

  if (cicdRuns.length === 0) return {
    cicdRuns: [],
    nextPage: null
  }

  const insertedRuns = await db.transaction(async (tx) => {
    return Promise.all(cicdRuns.map(run =>
      tx.insert(entities.cicdRuns).values(run)
        .onConflictDoUpdate({
          target: [entities.cicdRuns.externalId, entities.cicdRuns.workflowRunner, entities.cicdRuns.repositoryId],
          set: {
            workflowExternalId: run.workflowExternalId,
            runAttempt: run.runAttempt,
            detailsUrl: run.detailsUrl,
            gitSha: run.gitSha,
            gitBranch: run.gitBranch,
            status: run.status,
            result: run.result,
            runStartedAt: run.runStartedAt,
            createdAt: run.createdAt,
            updatedAt: run.updatedAt,
            _updatedAt: sql`(strftime('%s', 'now'))`,
          }
        })
        .returning()
        .get()
    ));
  });

  // issue: returns first 1000 results. for bigger time periods need to implement period splitting
  if (paginationInfo.page < paginationInfo.totalPages) {
    return {
      cicdRuns: insertedRuns,
      nextPage: paginationInfo.page + 1,
    }
  };

  return {
    cicdRuns: insertedRuns,
    nextPage: null
  };
}

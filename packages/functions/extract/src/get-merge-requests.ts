import type { NewMergeRequest } from "@acme/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { Pagination, SourceControl } from "@acme/source-control";

export type GetMergeRequestsInput = {
  externalRepositoryId: number;
  namespaceName: string;
  repositoryName: string;
  page?: number;
  perPage?: number;
};

export type GetMergeRequestsOutput = {
  mergeRequests: NewMergeRequest[];
  paginationInfo: Pagination;
};

export type GetMergeRequestsSourceControl = Pick<SourceControl, "fetchMergeRequests">;
export type GetMergeRequestsEntities = Pick<Entities, "mergeRequests">;

export type GetMergeRequestsFunction = ExtractFunction<GetMergeRequestsInput, GetMergeRequestsOutput, GetMergeRequestsSourceControl, GetMergeRequestsEntities>;

export const getMergeRequests: GetMergeRequestsFunction  = async (
  { externalRepositoryId, namespaceName, repositoryName },
  { integrations, db, entities }
) => {
    const { mergeRequests, pagination } = await integrations.sourceControl.fetchMergeRequests(externalRepositoryId, namespaceName, repositoryName);

    await db.insert(entities.mergeRequests).values(mergeRequests)
      .onConflictDoNothing({ target: entities.mergeRequests.externalId })
      .run();

    return {
      mergeRequests,
      paginationInfo: pagination,
    };
  };

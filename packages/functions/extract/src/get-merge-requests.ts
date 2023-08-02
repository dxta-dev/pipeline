import type { MergeRequest } from "@acme/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { Pagination, SourceControl } from "@acme/source-control";

export type GetMergeRequestsInput = {
  externalRepositoryId: number;
  namespaceName: string;
  repositoryName: string;
  repositoryId: number;
  page?: number;
  perPage?: number;
};

export type GetMergeRequestsOutput = {
  mergeRequests: MergeRequest[];
  paginationInfo: Pagination;
};

export type GetMergeRequestsSourceControl = Pick<SourceControl, "fetchMergeRequests">;
export type GetMergeRequestsEntities = Pick<Entities, "mergeRequests">;

export type GetMergeRequestsFunction = ExtractFunction<GetMergeRequestsInput, GetMergeRequestsOutput, GetMergeRequestsSourceControl, GetMergeRequestsEntities>;

export const getMergeRequests: GetMergeRequestsFunction  = async (
  { externalRepositoryId, namespaceName, repositoryName, repositoryId },
  { integrations, db, entities }
) => {
    const { mergeRequests, pagination } = await integrations.sourceControl.fetchMergeRequests(externalRepositoryId, namespaceName, repositoryName, repositoryId);

    const insertedMergeRequests = await db.insert(entities.mergeRequests).values(mergeRequests)
      .onConflictDoNothing({ target: entities.mergeRequests.externalId }).returning()
      .all();
      
    return {
      mergeRequests: insertedMergeRequests,
      paginationInfo: pagination,
    };
  };

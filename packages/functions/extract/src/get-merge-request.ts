import type { NewMergeRequest } from "@acme/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { Pagination, SourceControl } from "@acme/source-control";

export type GetAllMergeRequestsInput = {
  externalRepositoryId: number;
  page?: number;
  perPage?: number;
};

export type GetAllMergeRequestsOutput = {
  mergeRequests: NewMergeRequest[];
  paginationInfo: Pagination;
};

export type GetAllMergeRequestsSourceControl = Pick<SourceControl, "fetchMergeRequests">;
export type GetAllMergeRequestsEntities = Pick<Entities, "mergeRequests">;

export type GetAllMergeRequestsFunction = ExtractFunction<GetAllMergeRequestsInput, GetAllMergeRequestsOutput, GetAllMergeRequestsSourceControl, GetAllMergeRequestsEntities>;

export const getAllMergeRequests: GetAllMergeRequestsFunction  = async (
  { externalRepositoryId },
  { integrations, db, entities }
) => {
    const { mergeRequests, pagination } = await integrations.sourceControl.fetchMergeRequests(externalRepositoryId);

    /* why? */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await db.insert(entities.mergeRequests).values(mergeRequests)
      .onConflictDoNothing({ target: entities.mergeRequests.externalId })
      .run();

    return {
      mergeRequests,
      paginationInfo: pagination,
    };
  };

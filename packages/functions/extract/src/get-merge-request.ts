import type { NewMergeRequest } from "@acme/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { Pagination, SourceControl } from "@acme/source-control";

export type GetAllMergeRequestInput = {
  externalRepositoryId: number;
  page?: number;
  perPage?: number;
};

export type GetAllMergeRequestOutput = {
  mergeRequests: NewMergeRequest[];
  paginationInfo: Pagination;
};

export type GetAllMergeRequestSourceControl = Pick<SourceControl, "fetchMergeRequests">;
export type GetAllMergeRequestEntities = Pick<Entities, "mergeRequests">;

export type GetAllMergeRequestFunction = ExtractFunction<GetAllMergeRequestInput, GetAllMergeRequestOutput, GetAllMergeRequestSourceControl, GetAllMergeRequestEntities>;

export const getAllMergeRequest: GetAllMergeRequestFunction  = async (
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

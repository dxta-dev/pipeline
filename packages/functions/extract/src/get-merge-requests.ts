import type { MergeRequest } from "@dxta/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { Pagination, SourceControl, TimePeriod } from "@dxta/source-control";
import { sql } from "drizzle-orm";

export type GetMergeRequestsInput = {
  externalRepositoryId: number;
  namespaceName: string;
  repositoryName: string;
  repositoryId: number;
  page?: number;
  perPage: number;
  timePeriod?: TimePeriod;
  totalPages?: number;
};

export type GetMergeRequestsOutput = {
  mergeRequests: MergeRequest[];
  paginationInfo: Pagination;
};

export type GetMergeRequestsSourceControl = Pick<SourceControl, "fetchMergeRequests">;
export type GetMergeRequestsEntities = Pick<Entities, "mergeRequests">;

export type GetMergeRequestsFunction = ExtractFunction<GetMergeRequestsInput, GetMergeRequestsOutput, GetMergeRequestsSourceControl, GetMergeRequestsEntities>;


export const wasMergeRequestUpdatedInTimePeriod = (mergeRequest: MergeRequest, timePeriod: TimePeriod) => {
  const timestamp = mergeRequest.updatedAt || mergeRequest.createdAt; // TODO: why is updatedAt nullable ? Add note in table
  
  return timestamp.getTime() < timePeriod.to.getTime() && timestamp.getTime() >= timePeriod.from.getTime();
}

export const getMergeRequests: GetMergeRequestsFunction = async (
  { externalRepositoryId, namespaceName, repositoryName, repositoryId, page, perPage, timePeriod, totalPages },
  { integrations, db, entities },
) => {

  if (!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }

  const { mergeRequests, pagination } = await integrations.sourceControl.fetchMergeRequests(externalRepositoryId, namespaceName, repositoryName, repositoryId, perPage, timePeriod, page, totalPages);

  const insertedMergeRequests = await db.transaction(async (tx) => {
    return Promise.all(mergeRequests.map(mergeRequest =>
      tx.insert(entities.mergeRequests).values(mergeRequest)
        .onConflictDoUpdate({
          target: [
            entities.mergeRequests.externalId,
            entities.mergeRequests.repositoryId,
          ],
          set: {
            _updatedAt: sql`(strftime('%s', 'now'))`,
          },
        })
        .returning()
        .get()
    ))
  });

  if (timePeriod === undefined) return {
    mergeRequests: insertedMergeRequests,
    paginationInfo: pagination
  }

  return {
    mergeRequests: insertedMergeRequests.filter(mr => wasMergeRequestUpdatedInTimePeriod(mr, timePeriod)),
    paginationInfo: pagination,
  };
};

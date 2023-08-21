import type { MergeRequest } from "@acme/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { Pagination, SourceControl } from "@acme/source-control";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

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

export type GetPaginationDataOutput = {
  paginationInfo: Pagination;
};

export type GetMergeRequestsSourceControl = Pick<SourceControl, "fetchMergeRequests">;
export type GetMergeRequestsEntities = Pick<Entities, "mergeRequests">;

export type GetMergeRequestsFunction = ExtractFunction<GetMergeRequestsInput, GetMergeRequestsOutput, GetMergeRequestsSourceControl, GetMergeRequestsEntities>;


export const getMergeRequests: GetMergeRequestsFunction = async (
  { externalRepositoryId, namespaceName, repositoryName, repositoryId, page, perPage},
  { integrations, db, entities },
) => {

  if(!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }

  const { mergeRequests, pagination } = await integrations.sourceControl.fetchMergeRequests(externalRepositoryId, namespaceName, repositoryName, repositoryId, {}, page, perPage);

  console.log("mergeRequests", mergeRequests);

  const insertedMergeRequests = await (db as (LibSQLDatabase & BetterSQLite3Database)).transaction(async (tx) => {
    return Promise.all(mergeRequests.map(mergeRequest =>
      tx.insert(entities.mergeRequests).values(mergeRequest)
        .onConflictDoUpdate({ target: entities.mergeRequests.externalId, set: { updatedAt: new Date() } })
        .returning()
        .get()
    ));
  });

    return {
      mergeRequests: insertedMergeRequests,
      paginationInfo: pagination,
    };
  };

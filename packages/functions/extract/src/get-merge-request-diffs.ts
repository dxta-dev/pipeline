import type { MergeRequestDiff } from "@acme/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { Pagination, SourceControl } from "@acme/source-control";
// import type { LibSQLDatabase } from "drizzle-orm/libsql";
// import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

export type GetMergeRequestDiffsInput = {
  repositoryId: number;
  namespaceId: number;
  mergeRequestId: number;
  page?: number;
  perPage?: number;
};

export type GetMergeRequestDiffsOutput = {
  mergeRequestDiffs: MergeRequestDiff[];
  paginationInfo: Pagination;
};

export type GetMergeRequestDiffsSourceControl = Pick<SourceControl, "fetchMergeRequestDiffs">;
export type GetMergeRequestDiffsEntities = Pick<Entities, "namespaces" | "repositories" | "mergeRequests" | "mergeRequestDiffs">;

export type GetMergeRequestDiffsFunction = ExtractFunction<GetMergeRequestDiffsInput, GetMergeRequestDiffsOutput, GetMergeRequestDiffsSourceControl, GetMergeRequestDiffsEntities>;

export const getMergeRequestsDiffs: GetMergeRequestDiffsFunction = async (
  { mergeRequestId, namespaceId, repositoryId, page, perPage },
  { db, entities, integrations }
) => {
  throw new Error("not yet implemented");
}

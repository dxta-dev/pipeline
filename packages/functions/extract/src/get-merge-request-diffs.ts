import type { MergeRequestDiff } from "@acme/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { Pagination, SourceControl } from "@acme/source-control";
import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

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
  //eslint-disable-next-line @typescript-eslint/await-thenable
  const namespace = await db.select().from(entities.namespaces).where(eq(entities.namespaces.id, namespaceId)).get();
  if (!namespace) throw new Error(`Invalid namespace: ${namespaceId}`);

  //eslint-disable-next-line @typescript-eslint/await-thenable
  const repository = await db.select().from(entities.repositories).where(eq(entities.repositories.id, repositoryId)).get();
  if (!repository) throw new Error(`Invalid repository: ${repositoryId}`);

  //eslint-disable-next-line @typescript-eslint/await-thenable
  const mergeRequest = await db.select().from(entities.mergeRequests).where(eq(entities.mergeRequests.id, mergeRequestId)).get();
  if (!mergeRequest) throw new Error(`Invalid mergeRequest: ${mergeRequestId}`);

  if (!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }

  const { mergeRequestDiffs, pagination } = await integrations.sourceControl.fetchMergeRequestDiffs(repository, namespace, mergeRequest, page, perPage);

  const insertedMergeRequestDiffs = await (db as (LibSQLDatabase & BetterSQLite3Database)).transaction(async (tx) => {
    return Promise.all(mergeRequestDiffs.map(mergeRequestDiff =>
      tx.insert(entities.mergeRequestDiffs).values(mergeRequestDiff)
        .onConflictDoUpdate({
          target: [entities.mergeRequestDiffs.mergeRequestId, entities.mergeRequestDiffs.newPath],
          set: {
            diff: mergeRequestDiff.diff,
            newPath: mergeRequestDiff.newPath,
            oldPath: mergeRequestDiff.oldPath,
            aMode: mergeRequestDiff.aMode,
            bMode: mergeRequestDiff.bMode,
            newFile: mergeRequestDiff.newFile,
            renamedFile: mergeRequestDiff.renamedFile,
            deletedFile: mergeRequestDiff.deletedFile,
            _updatedAt: new Date(),
          }
        })
        .returning()
        .get()
    ));
  });

  console.log('insertedMergeRequestDiffs', ...mergeRequestDiffs);

  return {
    mergeRequestDiffs: insertedMergeRequestDiffs,
    paginationInfo: pagination
  }
}

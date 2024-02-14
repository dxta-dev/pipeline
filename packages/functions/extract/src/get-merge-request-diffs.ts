import type { MergeRequestDiff } from "@dxta/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { Pagination, SourceControl } from "@dxta/source-control";
import { eq, sql } from "drizzle-orm";

export type GetMergeRequestDiffsInput = {
  repositoryId: number;
  namespaceId: number;
  mergeRequestId: number;
  page?: number;
  perPage: number;
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
  const namespace = await db.select().from(entities.namespaces).where(eq(entities.namespaces.id, namespaceId)).get();
  if (!namespace) throw new Error(`Invalid namespace: ${namespaceId}`);

  const repository = await db.select().from(entities.repositories).where(eq(entities.repositories.id, repositoryId)).get();
  if (!repository) throw new Error(`Invalid repository: ${repositoryId}`);

  const mergeRequest = await db.select().from(entities.mergeRequests).where(eq(entities.mergeRequests.id, mergeRequestId)).get();
  if (!mergeRequest) throw new Error(`Invalid mergeRequest: ${mergeRequestId}`);

  if (!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }

  const { mergeRequestDiffs, pagination } = await integrations.sourceControl.fetchMergeRequestDiffs(repository, namespace, mergeRequest, perPage, page);

  const insertedMergeRequestDiffs = await db.transaction(async (tx) => {
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
            _updatedAt: sql`(strftime('%s', 'now'))`,
          }
        })
        .returning()
        .get()
    ));
  });

  return {
    mergeRequestDiffs: insertedMergeRequestDiffs,
    paginationInfo: pagination
  }
}

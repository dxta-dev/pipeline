import type { SourceControl } from "@acme/source-control";
import type { Entities, ExtractFunction } from "./config"
import type { MergeRequestCommit } from "@acme/extract-schema";
import { eq, sql } from "drizzle-orm";

export type GetMergeRequestCommitsInput = {
  mergeRequestId: number;
  namespaceId: number;
  repositoryId: number;
};

export type GetMergeRequestCommitsOutput = {
  mergeRequestCommits: MergeRequestCommit[];
};

export type GetMergeRequestCommitsSourceControl = Pick<SourceControl, "fetchMergeRequestCommits">;
export type GetMergeRequestCommitsEntities = Pick<Entities, "namespaces" | "repositories" | "mergeRequests" | "mergeRequestCommits">;

export type GetMergeRequestCommitsFunction = ExtractFunction<GetMergeRequestCommitsInput, GetMergeRequestCommitsOutput, GetMergeRequestCommitsSourceControl, GetMergeRequestCommitsEntities>

export const getMergeRequestCommits: GetMergeRequestCommitsFunction = async (
  { mergeRequestId, namespaceId, repositoryId },
  { integrations, db, entities },
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

  const { mergeRequestCommits } = await integrations.sourceControl.fetchMergeRequestCommits(repository, namespace, mergeRequest);

  const insertedMergeRequestCommits = await db.transaction(async (tx) => {
    return Promise.all(mergeRequestCommits.map(mergeRequestCommit =>
      tx.insert(entities.mergeRequestCommits).values(mergeRequestCommit)
        .onConflictDoUpdate({
          target: [entities.mergeRequestCommits.mergeRequestId, entities.mergeRequestCommits.externalId],
          set: {
            createdAt: mergeRequestCommit.createdAt,
            committedDate: mergeRequestCommit.committedDate,
            title: mergeRequestCommit.title,
            message: mergeRequestCommit.message,
            _updatedAt: sql`(strftime('%s', 'now'))`,
          }
        })
        .returning()
        .get()
    ));
  });

  return {
    mergeRequestCommits: insertedMergeRequestCommits,
  }
};

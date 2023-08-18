import type { SourceControl } from "@acme/source-control";
import type { Entities, ExtractFunction } from "./config"
import type { MergeRequestCommit } from "@acme/extract-schema";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type{ BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

export type GetMergeRequestCommitsInput = {
  externalRepositoryId: number;
  namespaceName: string;
  repositoryName: string;
  mergerequestIId: number;
};

export type GetMergeRequestCommitsOutput = {
  mergeRequestCommits: MergeRequestCommit[];
};

export type GetMergeRequestCommitsSourceControl = Pick<SourceControl, "fetchMergeRequestCommits">;
export type GetMergeRequestCommitsEntities = Pick<Entities, "mergeRequestCommits">;

export type GetMergeRequestCommitsFunction = ExtractFunction<GetMergeRequestCommitsInput, GetMergeRequestCommitsOutput, GetMergeRequestCommitsSourceControl, GetMergeRequestCommitsEntities>

export const getMergeRequestCommits: GetMergeRequestCommitsFunction = async (
  { externalRepositoryId, namespaceName, repositoryName, mergerequestIId },
  { integrations, db, entities },
) => {

  if(!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }

  const { mergeRequestCommits } = await integrations.sourceControl.fetchMergeRequestCommits(externalRepositoryId, namespaceName, repositoryName, mergerequestIId, {});

  const insertedMergeRequestCommits = await (db as (LibSQLDatabase & BetterSQLite3Database)).transaction(async (tx) => {
    return Promise.all(mergeRequestCommits.map(mergeRequestCommit => 
      tx.insert(entities.mergeRequestCommits).values(mergeRequestCommit)
        .onConflictDoUpdate({ 
          target: entities.mergeRequestCommits.externalId,
          set: { 
            createdAt: mergeRequestCommit.createdAt,
            committedDate: mergeRequestCommit.committedDate,
            title: mergeRequestCommit.title,
            message: mergeRequestCommit.message,
            _updatedAt: new Date(),
          } })
        .returning()
        .get()
      ));
  });

  return {
    mergeRequestCommits: insertedMergeRequestCommits,
  }
};
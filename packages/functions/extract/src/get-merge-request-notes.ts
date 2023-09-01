import type { SourceControl } from "@acme/source-control"
import type { ExtractFunction, Entities } from "./config";
import type { MergeRequestNote } from "@acme/extract-schema";
import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

export type GetMergeRequestNotesInput = {
  repositoryId: number;
  namespaceId: number;
  mergeRequestId: number;
};

export type GetMergeRequestNotesOutput = {
  mergeRequestNotes: MergeRequestNote[];
};

export type GetMergeRequestNotesSourceControl = Pick<SourceControl, "fetchMergeRequestNotes">;
export type GetMergeRequestNotesEntities = Pick<Entities, "namespaces" | "repositories" | "mergeRequests" | "mergeRequestNotes">;

export type GetMergeRequestNotesFunction = ExtractFunction<GetMergeRequestNotesInput, GetMergeRequestNotesOutput, GetMergeRequestNotesSourceControl, GetMergeRequestNotesEntities>;

export const getMergeRequestNotes: GetMergeRequestNotesFunction = async (
  { repositoryId, namespaceId, mergeRequestId },
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

  const { mergeRequestNotes } = await integrations.sourceControl.fetchMergeRequestNotes(repository, namespace, mergeRequest);

  const insertedMergeRequestNotes = await (db as (LibSQLDatabase & BetterSQLite3Database)).transaction(async (tx) =>
    Promise.all(mergeRequestNotes.map(mergeRequestNote =>
      tx.insert(entities.mergeRequestNotes).values(mergeRequestNote)
        .onConflictDoUpdate({
          target: entities.mergeRequestNotes.externalId,
          set: {
            updatedAt: mergeRequestNote.updatedAt
          }
        })
        .returning()
        .get()
    ))
  )

  return {
    mergeRequestNotes: insertedMergeRequestNotes
  };
}

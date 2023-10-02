import type { SourceControl } from "@acme/source-control"
import type { ExtractFunction, Entities } from "./config";
import type { Member, MergeRequestNote, NewMember } from "@acme/extract-schema";
import { eq } from "drizzle-orm";

export type GetMergeRequestNotesInput = {
  repositoryId: number;
  namespaceId: number;
  mergeRequestId: number;
};

export type GetMergeRequestNotesOutput = {
  mergeRequestNotes: MergeRequestNote[];
  members: Member[];
};

export type GetMergeRequestNotesSourceControl = Pick<SourceControl, "fetchMergeRequestNotes">;
export type GetMergeRequestNotesEntities = Pick<Entities, "namespaces" | "repositories" | "mergeRequests" | "mergeRequestNotes" | "members">;

export type GetMergeRequestNotesFunction = ExtractFunction<GetMergeRequestNotesInput, GetMergeRequestNotesOutput, GetMergeRequestNotesSourceControl, GetMergeRequestNotesEntities>;

export const getMergeRequestNotes: GetMergeRequestNotesFunction = async (
  { repositoryId, namespaceId, mergeRequestId },
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

  const { mergeRequestNotes } = await integrations.sourceControl.fetchMergeRequestNotes(repository, namespace, mergeRequest);

  const mergeRequestNoteUniqueAuthors = [...mergeRequestNotes.reduce((externalIdToAuthor, note) =>
    externalIdToAuthor.set(note.authorExternalId, {
      externalId: note.authorExternalId,
      username: note.authorUsername,
      forgeType: repository.forgeType,
      extractedSource: 'notes',
    }), new Map<number, NewMember>()).values()];

  const insertedMembers = await db.transaction(async (tx) => {
    return Promise.all(mergeRequestNoteUniqueAuthors.map(author =>
      tx.insert(entities.members).values(author)
        .onConflictDoUpdate({ target: [entities.members.externalId, entities.members.forgeType], set: { username: author.username } })
        .returning()
        .get()
    ));
  });

  const insertedMergeRequestNotes = await db.transaction(async (tx) =>
    Promise.all(mergeRequestNotes.map(mergeRequestNote =>
      tx.insert(entities.mergeRequestNotes).values(mergeRequestNote)
        .onConflictDoUpdate({
          target: [entities.mergeRequestNotes.mergeRequestId, entities.mergeRequestNotes.externalId],
          set: {
            updatedAt: mergeRequestNote.updatedAt
          }
        })
        .returning()
        .get()
    ))
  )

  return {
    mergeRequestNotes: insertedMergeRequestNotes,
    members: insertedMembers
  };
}

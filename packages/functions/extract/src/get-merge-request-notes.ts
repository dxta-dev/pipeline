import type { SourceControl } from "@dxta/source-control"
import type { ExtractFunction, Entities } from "./config";
import { type Member, type MergeRequestNote, type NewMember } from "@dxta/extract-schema";
import { eq, sql } from "drizzle-orm";

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
export type GetMergeRequestNotesEntities = Pick<Entities, "namespaces" | "repositories" | "mergeRequests" | "mergeRequestNotes" | "members" | "repositoriesToMembers">;

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
        .onConflictDoUpdate({
          target: [
            entities.members.externalId,
            entities.members.forgeType
          ],
          set: {
            username: author.username,
            _updatedAt: sql`(strftime('%s', 'now'))`,
          },
        })
        .returning()
        .get()
    ));
  });

  if (insertedMembers.length > 0) {
    await db.insert(entities.repositoriesToMembers)
      .values(insertedMembers.map(member => ({ memberId: member.id, repositoryId })))
      .onConflictDoNothing()
      .run();
  }


  const insertedMergeRequestNotes = await db.transaction(async (tx) =>
    Promise.all(mergeRequestNotes.map(mergeRequestNote =>
      tx.insert(entities.mergeRequestNotes).values(mergeRequestNote)
        .onConflictDoUpdate({
          target: [entities.mergeRequestNotes.mergeRequestId, entities.mergeRequestNotes.externalId],
          set: {
            authorUsername: mergeRequestNote.authorUsername,
            body: mergeRequestNote.body, // gitlab system notes could change format            
            updatedAt: mergeRequestNote.updatedAt,
            _updatedAt: sql`(strftime('%s', 'now'))`,
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

import type { SourceControl } from "@acme/source-control"
import type { ExtractFunction, Entities } from "./config";
import type { MergeRequestNote } from "@acme/extract-schema";

export type GetMergeRequestNotesInput = {
  repositoryId: number;
  namespaceId: number;
  mergeRequestId: number;
};

export type GetMergeRequestNotesOutput = {
  mergeRequestNotes: MergeRequestNote[];
};

export type GetMergeRequestNotesSourceControl = Pick<SourceControl, "fetchMergeRequestNotes">;
export type GetMergeRequestNotesEntities = Pick<Entities, "mergeRequestNotes">;

export type GetMergeRequestNotesFunction = ExtractFunction<GetMergeRequestNotesInput, GetMergeRequestNotesOutput, GetMergeRequestNotesSourceControl, GetMergeRequestNotesEntities>;

export const getMergeRequestNotes: GetMergeRequestNotesFunction = async (
  { repositoryId, namespaceId, mergeRequestId },
  { db, entities: { mergeRequestNotes }, integrations }
) => {
  // const { mergeRequestNotes } = await integrations.sourceControl.fetchMergeRequestNotes(repository, namespace, mergeRequest);
  return {
    mergeRequestNotes: []
  }
}

import { eq, inArray } from "drizzle-orm";
import type { ExtractEntities, TransformEntities, TransformFunction } from "./config";
import type { NewMergeRequest as TransformedMergeRequest } from "@acme/transform-schema";
import type { MergeRequest as ExtractMergeRequest} from "@acme/extract-schema";
import { isCodeGen } from "./is-codegen";

export type SetMergeRequestDiffsInput = {
  extractMergeRequestIds: ExtractMergeRequest["id"][];
}
export type SetMergeRequestDiffsOutput = void;
export type SetMergeRequestDiffsExtractEntities = Pick<ExtractEntities, 'repositories' | 'mergeRequests' | 'mergeRequestDiffs'>;
export type SetMergeRequestDiffsTransformEntities = Pick<TransformEntities, 'mergeRequests'>;

export type SetMergeRequestDiffsFunction = TransformFunction<SetMergeRequestDiffsInput, SetMergeRequestDiffsOutput, SetMergeRequestDiffsExtractEntities, SetMergeRequestDiffsTransformEntities>;


export const setMergeRequestDiffs: SetMergeRequestDiffsFunction = async (
    { extractMergeRequestIds },
    { extract, transform }
  ) => {

    const transformedMergeRequestDiffs = await extract.db.select({
      new_path: extract.entities.mergeRequestDiffs.newPath,
      old_path: extract.entities.mergeRequestDiffs.oldPath,
      diff: extract.entities.mergeRequestDiffs.diff,
      mergeRequestId: extract.entities.mergeRequestDiffs.mergeRequestId,
    }).from(extract.entities.mergeRequestDiffs)
      .where(inArray(extract.entities.mergeRequestDiffs.mergeRequestId, extractMergeRequestIds))
      .all();
      if (transformedMergeRequestDiffs.length === 0) {
        console.error(new Error(`No extracted merge request diffs found for ids: ${extractMergeRequestIds}`));
        return;  
      }
      
      for (let i = 0; i < transformedMergeRequestDiffs.length; i++) {
      if (transformedMergeRequestDiffs[i] && transformedMergeRequestDiffs[i]?.new_path) {
        const codeGenResult = isCodeGen(transformedMergeRequestDiffs[i]?.new_path as string);
      }
    }
  }
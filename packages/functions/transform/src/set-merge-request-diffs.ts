import type { ExtractEntities, TransformEntities, TransformFunction } from "./config";
import type { MergeRequest as ExtractMergeRequest} from "@acme/extract-schema";
import { isCodeGen } from "./is-codegen";
import { parseHunks } from "./parse-hunks";
import { eq } from "drizzle-orm";

export type SetMergeRequestDiffsInput = {
  extractMergeRequestId: ExtractMergeRequest["id"];
}
export type SetMergeRequestDiffsOutput = number | undefined;
export type SetMergeRequestDiffsExtractEntities = Pick<ExtractEntities, 'repositories' | 'mergeRequests' | 'mergeRequestDiffs'>;
export type SetMergeRequestDiffsTransformEntities = Pick<TransformEntities, 'mergeRequests'>;

export type SetMergeRequestDiffsFunction = TransformFunction<SetMergeRequestDiffsInput, SetMergeRequestDiffsOutput, SetMergeRequestDiffsExtractEntities, SetMergeRequestDiffsTransformEntities>;

export const calculateMergeRequestSize: SetMergeRequestDiffsFunction = async (
    { extractMergeRequestId },
    { extract }
) => {

    const transformedMergeRequestDiffs = await extract.db.select({
        new_path: extract.entities.mergeRequestDiffs.newPath,
        old_path: extract.entities.mergeRequestDiffs.oldPath,
        diff: extract.entities.mergeRequestDiffs.diff,
        mergeRequestId: extract.entities.mergeRequestDiffs.mergeRequestId,
    }).from(extract.entities.mergeRequestDiffs)
      .where(eq(extract.entities.mergeRequestDiffs.mergeRequestId, extractMergeRequestId))
      .all();

    if (transformedMergeRequestDiffs.length === 0) {
        console.error(new Error(`No extracted merge request diffs found for ids: ${extractMergeRequestId}`));
        return;  
    }

    let mergeRequestSize = 0; 

    for (let i = 0; i < transformedMergeRequestDiffs.length; i++) {

        if (transformedMergeRequestDiffs[i] && transformedMergeRequestDiffs[i]?.new_path && transformedMergeRequestDiffs[i]?.diff) {
            const codeGenResult = isCodeGen(transformedMergeRequestDiffs[i]?.new_path as string);

            if (codeGenResult === true) {
                console.error(new Error(`This file is part of codeGen: ${transformedMergeRequestDiffs[i]?.new_path}`));
                continue;
            }

            const linesChanged = parseHunks(transformedMergeRequestDiffs[i]?.diff as string);

            for (let j = 0; j < linesChanged.length; j++) {
                const line = linesChanged[j];
                const additions = line?.additions;
                const deletions = line?.deletions;

                if (additions) {
                    mergeRequestSize += additions;
                }
                if (deletions) {
                    mergeRequestSize += deletions;
                }
            }
        }
    }
    return mergeRequestSize;
}

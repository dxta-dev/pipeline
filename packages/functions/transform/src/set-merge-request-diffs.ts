import { inArray } from "drizzle-orm";
import type { ExtractEntities, TransformEntities, TransformFunction } from "./config";
import type { NewMergeRequest as TransformedMergeRequest } from "@acme/transform-schema";
import type { MergeRequest as ExtractMergeRequest} from "@acme/extract-schema";
import { isCodeGen } from "./is-codegen";
import { parseHunks } from "./parse-hunks";

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

    const mergeRequestSizes: Record<number, number> = {}; 

    for (let i = 0; i < transformedMergeRequestDiffs.length; i++) {
        const mergeRequestId = transformedMergeRequestDiffs[i]?.mergeRequestId as number;

        if (!mergeRequestSizes[mergeRequestId]) {
            mergeRequestSizes[mergeRequestId] = 0;
        }

        if (transformedMergeRequestDiffs[i] && transformedMergeRequestDiffs[i]?.new_path && transformedMergeRequestDiffs[i]?.diff) {
            const codeGenResult = isCodeGen(transformedMergeRequestDiffs[i]?.new_path as string);

            if (codeGenResult === true) {
                console.error(new Error(`This file is part of codeGen: ${transformedMergeRequestDiffs[i]?.new_path}`));
                continue;
            }

            const linesChanged = parseHunks(transformedMergeRequestDiffs[i]?.diff as string);
            let additionsTotal = 0;
            let deletionsTotal = 0;

            for (let j = 0; j < linesChanged.length; j++) {
                const line = linesChanged[j];
                const additions = line?.additions;
                const deletions = line?.deletions;

                if (additions) {
                    additionsTotal += additions;
                }
                if (deletions) {
                    deletionsTotal += deletions;
                }
            }

            const mergeRequestSizePerIteration = additionsTotal + deletionsTotal;
            mergeRequestSizes[mergeRequestId] += mergeRequestSizePerIteration;
        }
    }

    // console.log('Merge Request Sizes:', mergeRequestSizes);
}

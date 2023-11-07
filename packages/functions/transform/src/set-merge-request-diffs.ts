import { eq, inArray } from "drizzle-orm";
import type { ExtractEntities, TransformEntities, TransformFunction } from "./config";
import type { NewMergeRequest as TransformedMergeRequest } from "@acme/transform-schema";
import type { MergeRequest as ExtractMergeRequest} from "@acme/extract-schema";

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
      externalId: extract.entities.mergeRequests.externalId,
      forgeType: extract.entities.repositories.forgeType,
      title: extract.entities.mergeRequests.title,
      webUrl: extract.entities.mergeRequests.webUrl,
    }).from(extract.entities.mergeRequestDiffs)
      .innerJoin(extract.entities.repositories, eq(extract.entities.mergeRequests.repositoryId, extract.entities.repositories.id))
      .where(inArray(extract.entities.mergeRequests.id, extractMergeRequestIds))
      .all() satisfies TransformedMergeRequest[];
  
    if (transformedMergeRequestDiffs.length === 0) {
      console.error(new Error(`No extracted merge request diffs found for ids: ${extractMergeRequestIds}`));
      return;
    }
  }


import { eq, inArray } from "drizzle-orm";
import type { ExtractEntities, TransformEntities, TransformFunction } from "./config";
import type { NewMergeRequest as TransformedMergeRequest } from "@acme/transform-schema";
import type { MergeRequest as ExtractMergeRequest } from "@acme/extract-schema";

export type SetMergeRequestsInput = {
  extractMergeRequestIds: ExtractMergeRequest["id"][];
}
export type SetMergeRequestsOutput = void;
export type SetMergeRequestsExtractEntities = Pick<ExtractEntities, 'repositories' | 'mergeRequests'>;
export type SetMergeRequestsTransformEntities = Pick<TransformEntities, 'mergeRequests'>;

export type SetMergeRequestsFunction = TransformFunction<SetMergeRequestsInput, SetMergeRequestsOutput, SetMergeRequestsExtractEntities, SetMergeRequestsTransformEntities>;

export const setMergeRequests: SetMergeRequestsFunction = async (
  { extractMergeRequestIds },
  { extract, transform }
) => {

  const transformedMergeRequests = await extract.db.select({
    externalId: extract.entities.mergeRequests.externalId,
    forgeType: extract.entities.repositories.forgeType,
    title: extract.entities.mergeRequests.title,
    webUrl: extract.entities.mergeRequests.webUrl,
  }).from(extract.entities.mergeRequests)
    .innerJoin(extract.entities.repositories, eq(extract.entities.mergeRequests.repositoryId, extract.entities.repositories.id))
    .where(inArray(extract.entities.mergeRequests.id, extractMergeRequestIds))
    .all() satisfies TransformedMergeRequest[];

  await transform.db.insert(transform.entities.mergeRequests)
    .values(transformedMergeRequests)
    .onConflictDoNothing()
    // TODO: batchify onConflictDoUpdate
    // .onConflictDoUpdate({
    //   target: [transform.entities.mergeRequests.externalId, transform.entities.mergeRequests.forgeType], 
    //   set: {title:}
    // })
    .run();
}

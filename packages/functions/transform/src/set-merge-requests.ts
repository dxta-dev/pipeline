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

  if (transformedMergeRequests.length === 0) {
    console.error(new Error(`No extracted merge requests found for ids: ${extractMergeRequestIds}`));
    return;
  }

  const queries = transformedMergeRequests.map(
    mergeRequest => transform.db.insert(transform.entities.mergeRequests)
      .values(mergeRequest)
      .onConflictDoUpdate({
        target: [transform.entities.mergeRequests.externalId, transform.entities.mergeRequests.forgeType],
        set: { title: mergeRequest.title, webUrl: mergeRequest.webUrl }
      })
  );

  type Query = typeof queries[number];

  await transform.db.batch(
    queries as [Query, ...Query[]]
  );

}

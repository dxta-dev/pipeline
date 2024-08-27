import type { MergeRequest, Sha } from "@dxta/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { Pagination, SourceControl, TimePeriod } from "@dxta/source-control";
import { sql } from "drizzle-orm";

export type GetMergeRequestsInput = {
  externalRepositoryId: number;
  namespaceName: string;
  repositoryName: string;
  repositoryId: number;
  page?: number;
  perPage: number;
  timePeriod?: TimePeriod;
  totalPages?: number;
};

export type GetMergeRequestsOutput = {
  mergeRequests: MergeRequest[];
  paginationInfo: Pagination;
};

export type GetMergeRequestsSourceControl = Pick<SourceControl, "fetchMergeRequests">;
export type GetMergeRequestsEntities = Pick<Entities, "mergeRequests" | "repositoryShas">;

export type GetMergeRequestsFunction = ExtractFunction<GetMergeRequestsInput, GetMergeRequestsOutput, GetMergeRequestsSourceControl, GetMergeRequestsEntities>;


export const wasMergeRequestUpdatedInTimePeriod = (mergeRequest: MergeRequest, timePeriod: TimePeriod) => {
  const timestamp = mergeRequest.updatedAt || mergeRequest.createdAt; // TODO: why is updatedAt nullable ? Add note in table

  return timestamp.getTime() < timePeriod.to.getTime() && timestamp.getTime() >= timePeriod.from.getTime();
}

export const getMergeRequests: GetMergeRequestsFunction = async (
  { externalRepositoryId, namespaceName, repositoryName, repositoryId, page, perPage, timePeriod, totalPages },
  { integrations, db, entities },
) => {

  if (!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }

  const { mergeRequests, pagination } = await integrations.sourceControl.fetchMergeRequests(externalRepositoryId, namespaceName, repositoryName, repositoryId, perPage, timePeriod, page, totalPages);

  const insertedShas = await db.transaction(async (tx) => {
    return Promise.all(mergeRequests.map(mergeRequest => mergeRequest.mergeCommitSha).filter(sha => sha !== null).map(sha =>
      tx.insert(entities.repositoryShas).values({ repositoryId: repositoryId, sha })
        .onConflictDoUpdate({
          target: [entities.repositoryShas.repositoryId, entities.repositoryShas.sha],
          set: { _updatedAt: sql`(strftime('%s', 'now'))` },
        })
        .returning()
        .get()
    ));
  });

  const shaIdMap = insertedShas.reduce((map, sha) => map.set(sha.sha, sha.id), new Map<string, Sha['id']>());

  const insertedMergeRequests = await db.transaction(async (tx) => {
    return Promise.all(mergeRequests.map(mergeRequest =>
      tx.insert(entities.mergeRequests).values({
        externalId: mergeRequest.externalId,
        canonId: mergeRequest.canonId,
        repositoryId,
        mergeCommitShaId: mergeRequest.mergeCommitSha ? shaIdMap.get(mergeRequest.mergeCommitSha) as number : null,
        title: mergeRequest.title,
        description: mergeRequest.description,
        webUrl: mergeRequest.webUrl,
        createdAt: mergeRequest.createdAt,
        updatedAt: mergeRequest.updatedAt,
        mergedAt: mergeRequest.mergedAt,
        mergerExternalId: mergeRequest.mergerExternalId,
        closedAt: mergeRequest.closedAt,
        closerExternalId: mergeRequest.closerExternalId,
        authorExternalId: mergeRequest.authorExternalId,
        state: mergeRequest.state,
        targetBranch: mergeRequest.targetBranch,
        sourceBranch: mergeRequest.sourceBranch,
      })
        .onConflictDoUpdate({
          target: [
            entities.mergeRequests.externalId,
            entities.mergeRequests.repositoryId,
          ],
          set: {
            title: mergeRequest.title,
            description: mergeRequest.description,
            updatedAt: mergeRequest.updatedAt,
            mergedAt: mergeRequest.mergedAt,
            mergerExternalId: mergeRequest.mergerExternalId,
            closedAt: mergeRequest.closedAt,
            closerExternalId: mergeRequest.closerExternalId,
            state: mergeRequest.state,
            targetBranch: mergeRequest.targetBranch,
            sourceBranch: mergeRequest.sourceBranch,

            _updatedAt: sql`(strftime('%s', 'now'))`,

          },
        })
        .returning()
        .get()
    ))
  });

  if (timePeriod === undefined) return {
    mergeRequests: insertedMergeRequests,
    paginationInfo: pagination
  }

  return {
    mergeRequests: insertedMergeRequests.filter(mr => wasMergeRequestUpdatedInTimePeriod(mr, timePeriod)),
    paginationInfo: pagination,
  };
};

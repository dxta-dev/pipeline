import type { MergeRequest, NewMergeRequest, Sha } from "@dxta/extract-schema";
import type { SourceControl } from "@dxta/source-control";
import { sql } from "drizzle-orm";
import { isRelativeResidualMergeRequest } from "./classify-merge-requests";
import type { Entities, ExtractFunction } from "./config";

export type GetMergeRequestsV2Input = {
  externalRepositoryId: number;
  namespaceName: string;
  repositoryName: string;
  repositoryId: number;
  page?: number;
  perPage: number;
  updatedAfter?: Date;
};

export type GetMergeRequestsV2Output = {
  mergeRequests: MergeRequest[];
  processableMergeRequests: MergeRequest[];
  pagination: { page: number; perPage: number; hasMore: boolean };
  reachedWatermark: boolean;
};

export type GetMergeRequestsV2SourceControl = Pick<
  SourceControl,
  "fetchMergeRequestsV2"
>;
export type GetMergeRequestsV2Entities = Pick<
  Entities,
  "mergeRequests" | "repositoryShas"
>;

export type GetMergeRequestsV2Function = ExtractFunction<
  GetMergeRequestsV2Input,
  GetMergeRequestsV2Output,
  GetMergeRequestsV2SourceControl,
  GetMergeRequestsV2Entities
>;

const wasMergeRequestUpdatedAfter = (
  mergeRequest: NewMergeRequest,
  updatedAfter: Date,
) => {
  const timestamp = mergeRequest.updatedAt || mergeRequest.createdAt;
  return timestamp.getTime() >= updatedAfter.getTime();
};

export const getMergeRequestsV2: GetMergeRequestsV2Function = async (
  {
    externalRepositoryId,
    namespaceName,
    repositoryName,
    repositoryId,
    page,
    perPage,
    updatedAfter,
  },
  { integrations, db, entities },
) => {
  if (!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }

  if (!integrations.sourceControl.fetchMergeRequestsV2) {
    throw new Error("fetchMergeRequestsV2 not available on source control");
  }

  const { mergeRequests, pagination, reachedWatermark } =
    await integrations.sourceControl.fetchMergeRequestsV2(
      externalRepositoryId,
      namespaceName,
      repositoryName,
      repositoryId,
      perPage,
      updatedAfter,
      page,
    );

  // Filter MRs to only those updated after the watermark
  const mergeRequestsUpdatedAfterWatermark = mergeRequests.filter((mr) =>
    updatedAfter === undefined
      ? true
      : wasMergeRequestUpdatedAfter(mr, updatedAfter),
  );

  const insertedShas = await db.transaction(async (tx) => {
    return Promise.all(
      mergeRequestsUpdatedAfterWatermark
        .map((mergeRequest) => mergeRequest.mergeCommitSha)
        .filter((sha): sha is string => sha !== undefined && sha !== null)
        .map((sha) =>
          tx
            .insert(entities.repositoryShas)
            .values({ repositoryId: repositoryId, sha: sha })
            .onConflictDoUpdate({
              target: [
                entities.repositoryShas.repositoryId,
                entities.repositoryShas.sha,
              ],
              set: { _updatedAt: sql`(strftime('%s', 'now'))` },
            })
            .returning()
            .get(),
        ),
    );
  });

  const shaIdMap = insertedShas.reduce(
    (map, sha) => map.set(sha.sha, sha.id),
    new Map<string, Sha["id"]>(),
  );

  const insertedMergeRequests = await db.transaction(async (tx) => {
    return Promise.all(
      mergeRequestsUpdatedAfterWatermark.map((mergeRequest) =>
        tx
          .insert(entities.mergeRequests)
          .values({
            externalId: mergeRequest.externalId,
            canonId: mergeRequest.canonId,
            repositoryId: mergeRequest.repositoryId,
            mergeCommitShaId: mergeRequest.mergeCommitSha
              ? (shaIdMap.get(mergeRequest.mergeCommitSha) as number)
              : null,
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
              mergeCommitShaId: mergeRequest.mergeCommitSha
                ? (shaIdMap.get(mergeRequest.mergeCommitSha) as number)
                : null,
              _updatedAt: sql`(strftime('%s', 'now'))`,
            },
          })
          .returning()
          .get(),
      ),
    );
  });

  if (updatedAfter === undefined) {
    return {
      mergeRequests: insertedMergeRequests,
      pagination,
      processableMergeRequests: insertedMergeRequests,
      reachedWatermark,
    };
  }

  const SIX_MONTHS = 6 * 30 * 24 * 60 * 60 * 1000;
  const processable = insertedMergeRequests.filter(
    (mr) => !isRelativeResidualMergeRequest(mr, updatedAfter, SIX_MONTHS),
  );

  return {
    mergeRequests: insertedMergeRequests,
    pagination,
    processableMergeRequests: processable,
    reachedWatermark,
  };
};

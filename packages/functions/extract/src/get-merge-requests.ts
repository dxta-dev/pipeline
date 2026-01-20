import type { MergeRequest, NewMergeRequest, Sha } from "@dxta/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type {
  Pagination,
  SourceControl,
  TimePeriod,
} from "@dxta/source-control";
import { sql } from "drizzle-orm";
import { isRelativeResidualMergeRequest } from "./classify-merge-requests";

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
  processableMergeRequests: MergeRequest[];
  paginationInfo: Pagination;
};

export type GetMergeRequestsSourceControl = Pick<
  SourceControl,
  "fetchMergeRequests"
>;
export type GetMergeRequestsEntities = Pick<
  Entities,
  "mergeRequests" | "repositoryShas"
>;

export type GetMergeRequestsFunction = ExtractFunction<
  GetMergeRequestsInput,
  GetMergeRequestsOutput,
  GetMergeRequestsSourceControl,
  GetMergeRequestsEntities
>;

export const wasMergeRequestUpdatedInTimePeriod = (
  mergeRequest: NewMergeRequest,
  timePeriod: TimePeriod,
) => {
  const timestamp = mergeRequest.updatedAt || mergeRequest.createdAt; // TODO: why is updatedAt nullable ? Add note in table

  return (
    timestamp.getTime() < timePeriod.to.getTime() &&
    timestamp.getTime() >= timePeriod.from.getTime()
  );
};

export const getMergeRequests: GetMergeRequestsFunction = async (
  {
    externalRepositoryId,
    namespaceName,
    repositoryName,
    repositoryId,
    page,
    perPage,
    timePeriod,
    totalPages,
  },
  { integrations, db, entities },
) => {
  if (!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }

  const { mergeRequests, pagination } =
    await integrations.sourceControl.fetchMergeRequests(
      externalRepositoryId,
      namespaceName,
      repositoryName,
      repositoryId,
      perPage,
      timePeriod,
      page,
      totalPages,
    );

  // HOTFIX: insertion issue when page all PRs without intent. Should be removed at some point when we remove invalid pagination / identify issue
  const mergeRequestsUpdatedInPeriod = mergeRequests.filter((mr) =>
    timePeriod === undefined
      ? true
      : wasMergeRequestUpdatedInTimePeriod(mr, timePeriod),
  );

  const insertedShas = await db.transaction(async (tx) => {
    return Promise.all(
      mergeRequestsUpdatedInPeriod
        .map((mergeRequest) => mergeRequest.mergeCommitSha)
        .filter((sha) => sha != undefined)
        .map((sha) =>
          tx
            .insert(entities.repositoryShas)
            .values({ repositoryId: repositoryId, sha: sha as string })
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
      mergeRequestsUpdatedInPeriod.map((mergeRequest) =>
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

  if (timePeriod === undefined)
    return {
      mergeRequests: insertedMergeRequests,
      paginationInfo: pagination,
      processableMergeRequests: insertedMergeRequests,
    };

  const SIX_MONTHS = 6 * 30 * 24 * 60 * 60 * 1000;
  const processable = insertedMergeRequests.filter(
    (mr) => !isRelativeResidualMergeRequest(mr, timePeriod.from, SIX_MONTHS),
  );

  return {
    mergeRequests: insertedMergeRequests,
    paginationInfo: pagination,
    processableMergeRequests: processable,
  };
};

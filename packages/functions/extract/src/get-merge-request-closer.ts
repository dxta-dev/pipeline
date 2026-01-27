import type { MergeRequest } from "@dxta/extract-schema";
import type { SourceControl } from "@dxta/source-control";
import { eq, sql } from "drizzle-orm";
import type { Entities, ExtractFunction } from "./config";

export type GetMergeRequestCloserInput = {
  mergeRequestId: number;
  repositoryId: number;
  namespaceId: number;
};

export type GetMergeRequestCloserOutput = {
  mergeRequest?: MergeRequest;
  skipped?: boolean;
};

export type GetMergeRequestCloserSourceControl = Pick<
  SourceControl,
  "fetchMergeRequestCloser"
>;

export type GetMergeRequestCloserEntities = Pick<
  Entities,
  "mergeRequests" | "repositories" | "namespaces"
>;

export type GetMergeRequestCloserFunction = ExtractFunction<
  GetMergeRequestCloserInput,
  GetMergeRequestCloserOutput,
  GetMergeRequestCloserSourceControl,
  GetMergeRequestCloserEntities
>;

export const getMergeRequestCloser: GetMergeRequestCloserFunction = async (
  { mergeRequestId, repositoryId, namespaceId },
  { integrations, db, entities },
) => {
  if (!integrations.sourceControl?.fetchMergeRequestCloser) {
    return { skipped: true };
  }

  const mergeRequest = await db
    .select({
      id: entities.mergeRequests.id,
      canonId: entities.mergeRequests.canonId,
      closedAt: entities.mergeRequests.closedAt,
      mergedAt: entities.mergeRequests.mergedAt,
      closerExternalId: entities.mergeRequests.closerExternalId,
    })
    .from(entities.mergeRequests)
    .where(eq(entities.mergeRequests.id, mergeRequestId))
    .get();

  if (!mergeRequest) {
    throw new Error(`MergeRequest ${mergeRequestId} not found`);
  }

  // Only fetch closer for closed-but-not-merged PRs
  if (!mergeRequest.closedAt || mergeRequest.mergedAt) {
    return { skipped: true };
  }

  // Already have closer info
  if (mergeRequest.closerExternalId !== null) {
    return { skipped: true };
  }

  const repository = await db
    .select({ name: entities.repositories.name })
    .from(entities.repositories)
    .where(eq(entities.repositories.id, repositoryId))
    .get();

  const namespace = await db
    .select({ name: entities.namespaces.name })
    .from(entities.namespaces)
    .where(eq(entities.namespaces.id, namespaceId))
    .get();

  if (!repository || !namespace) {
    throw new Error(
      `Repository ${repositoryId} or namespace ${namespaceId} not found`,
    );
  }

  const { closerExternalId } =
    await integrations.sourceControl.fetchMergeRequestCloser(
      namespace.name,
      repository.name,
      mergeRequest.canonId,
    );

  const updatedMergeRequest = await db
    .update(entities.mergeRequests)
    .set({
      closerExternalId,
      _updatedAt: sql`(strftime('%s', 'now'))`,
    })
    .where(eq(entities.mergeRequests.id, mergeRequestId))
    .returning()
    .get();

  return { mergeRequest: updatedMergeRequest };
};

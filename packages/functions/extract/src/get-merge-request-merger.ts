import type { MergeRequest } from "@dxta/extract-schema";
import type { SourceControl } from "@dxta/source-control";
import { eq, sql } from "drizzle-orm";
import type { Entities, ExtractFunction } from "./config";

export type GetMergeRequestMergerInput = {
  mergeRequestId: number;
  repositoryId: number;
  namespaceId: number;
};

export type GetMergeRequestMergerOutput = {
  mergeRequest?: MergeRequest;
  skipped?: boolean;
};

export type GetMergeRequestMergerSourceControl = Pick<
  SourceControl,
  "fetchMergeRequestMerger"
>;

export type GetMergeRequestMergerEntities = Pick<
  Entities,
  "mergeRequests" | "repositories" | "namespaces"
>;

export type GetMergeRequestMergerFunction = ExtractFunction<
  GetMergeRequestMergerInput,
  GetMergeRequestMergerOutput,
  GetMergeRequestMergerSourceControl,
  GetMergeRequestMergerEntities
>;

export const getMergeRequestMerger: GetMergeRequestMergerFunction = async (
  { mergeRequestId, repositoryId, namespaceId },
  { integrations, db, entities },
) => {
  if (!integrations.sourceControl?.fetchMergeRequestMerger) {
    return { skipped: true };
  }

  const mergeRequest = await db
    .select({
      id: entities.mergeRequests.id,
      canonId: entities.mergeRequests.canonId,
      mergedAt: entities.mergeRequests.mergedAt,
      mergerExternalId: entities.mergeRequests.mergerExternalId,
    })
    .from(entities.mergeRequests)
    .where(eq(entities.mergeRequests.id, mergeRequestId))
    .get();

  if (!mergeRequest) {
    throw new Error(`MergeRequest ${mergeRequestId} not found`);
  }

  // Only fetch merger for merged PRs
  if (!mergeRequest.mergedAt) {
    return { skipped: true };
  }

  // Already have merger info
  if (mergeRequest.mergerExternalId !== null) {
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

  const { mergerExternalId } =
    await integrations.sourceControl.fetchMergeRequestMerger(
      namespace.name,
      repository.name,
      mergeRequest.canonId,
    );

  const updatedMergeRequest = await db
    .update(entities.mergeRequests)
    .set({
      mergerExternalId,
      _updatedAt: sql`(strftime('%s', 'now'))`,
    })
    .where(eq(entities.mergeRequests.id, mergeRequestId))
    .returning()
    .get();

  return { mergeRequest: updatedMergeRequest };
};

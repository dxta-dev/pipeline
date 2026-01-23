import type { SourceControl } from "@dxta/source-control";
import type { Entities, ExtractFunction } from "./config";
import type {
  Member,
  MergeRequestCommit,
  NewMember,
} from "@dxta/extract-schema";
import { eq, sql } from "drizzle-orm";

export type GetMergeRequestCommitsInput = {
  mergeRequestId: number;
  namespaceId: number;
  repositoryId: number;
};

export type GetMergeRequestCommitsOutput = {
  mergeRequestCommits: MergeRequestCommit[];
  members: Member[];
};

export type GetMergeRequestCommitsSourceControl = Pick<
  SourceControl,
  "fetchMergeRequestCommits"
>;
export type GetMergeRequestCommitsEntities = Pick<
  Entities,
  | "namespaces"
  | "repositories"
  | "mergeRequests"
  | "mergeRequestCommits"
  | "members"
  | "repositoriesToMembers"
>;

export type GetMergeRequestCommitsFunction = ExtractFunction<
  GetMergeRequestCommitsInput,
  GetMergeRequestCommitsOutput,
  GetMergeRequestCommitsSourceControl,
  GetMergeRequestCommitsEntities
>;

export const getMergeRequestCommits: GetMergeRequestCommitsFunction = async (
  { mergeRequestId, namespaceId, repositoryId },
  { integrations, db, entities },
) => {
  const namespace = await db
    .select()
    .from(entities.namespaces)
    .where(eq(entities.namespaces.id, namespaceId))
    .get();
  if (!namespace) throw new Error(`Invalid namespace: ${namespaceId}`);

  const repository = await db
    .select()
    .from(entities.repositories)
    .where(eq(entities.repositories.id, repositoryId))
    .get();
  if (!repository) throw new Error(`Invalid repository: ${repositoryId}`);

  const mergeRequest = await db
    .select()
    .from(entities.mergeRequests)
    .where(eq(entities.mergeRequests.id, mergeRequestId))
    .get();
  if (!mergeRequest) throw new Error(`Invalid mergeRequest: ${mergeRequestId}`);

  if (!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }

  const { mergeRequestCommits } =
    await integrations.sourceControl.fetchMergeRequestCommits(
      repository,
      namespace,
      mergeRequest,
    );

  const committersMap = new Map<number, NewMember>();
  mergeRequestCommits.forEach((commit) => {
    if (commit.authorExternalId && commit.authorUsername) {
      committersMap.set(commit.authorExternalId, {
        forgeType: repository.forgeType,
        externalId: commit.authorExternalId,
        username: commit.authorUsername,
        extractedSource: "commit",
      });
    }

    if (commit.committerExternalId && commit.committerUsername) {
      committersMap.set(commit.committerExternalId, {
        forgeType: repository.forgeType,
        externalId: commit.committerExternalId,
        username: commit.committerUsername,
        extractedSource: "commit",
      });
    }
  });

  const uniqueCommitters = [...committersMap.values()];

  const insertedUniqueCommitters =
    uniqueCommitters.length === 0
      ? []
      : await db.transaction(async (tx) => {
          return Promise.all(
            uniqueCommitters.map((actor) =>
              tx
                .insert(entities.members)
                .values(actor)
                .onConflictDoUpdate({
                  target: [
                    entities.members.externalId,
                    entities.members.forgeType,
                  ],
                  set: {
                    username: actor.username,
                    _updatedAt: sql`(strftime('%s', 'now'))`,
                  },
                })
                .returning()
                .get(),
            ),
          );
        });

  if (insertedUniqueCommitters.length > 0) {
    await db
      .insert(entities.repositoriesToMembers)
      .values(
        insertedUniqueCommitters.map((member) => ({
          memberId: member.id,
          repositoryId,
        })),
      )
      .onConflictDoNothing()
      .run();
  }

  const insertedMergeRequestCommits = await db.transaction(async (tx) => {
    return Promise.all(
      mergeRequestCommits.map((mergeRequestCommit) =>
        tx
          .insert(entities.mergeRequestCommits)
          .values(mergeRequestCommit)
          .onConflictDoUpdate({
            target: [
              entities.mergeRequestCommits.mergeRequestId,
              entities.mergeRequestCommits.externalId,
            ],
            set: {
              htmlUrl: mergeRequestCommit.htmlUrl,
              createdAt: mergeRequestCommit.createdAt,
              committedDate: mergeRequestCommit.committedDate,
              title: mergeRequestCommit.title,
              message: mergeRequestCommit.message,
              _updatedAt: sql`(strftime('%s', 'now'))`,
            },
          })
          .returning()
          .get(),
      ),
    );
  });

  return {
    mergeRequestCommits: insertedMergeRequestCommits,
    members: insertedUniqueCommitters,
  };
};

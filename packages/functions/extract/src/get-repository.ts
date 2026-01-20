import type { Namespace, Repository } from "@dxta/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { SourceControl } from "@dxta/source-control";
import { sql } from "drizzle-orm";

export type GetRepositoryInput = {
  externalRepositoryId: number;
  namespaceName: string;
  repositoryName: string;
};

export type GetRepositoryOutput = {
  repository: Repository;
  namespace: Namespace;
};

export type GetRepositorySourceControl = Pick<SourceControl, "fetchRepository">;
export type GetRepositoryEntities = Pick<
  Entities,
  "repositories" | "namespaces"
>;

export type GetRepositoryFunction = ExtractFunction<
  GetRepositoryInput,
  GetRepositoryOutput,
  GetRepositorySourceControl,
  GetRepositoryEntities
>;

export const getRepository: GetRepositoryFunction = async (
  { externalRepositoryId, namespaceName, repositoryName },
  { integrations, db, entities },
) => {
  if (!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }

  const { repository, namespace } =
    await integrations.sourceControl.fetchRepository(
      externalRepositoryId,
      namespaceName,
      repositoryName,
    );

  return await db.transaction(async (tx) => {
    const insertedNamespace = await tx
      .insert(entities.namespaces)
      .values(namespace)
      .onConflictDoUpdate({
        target: [entities.namespaces.externalId, entities.namespaces.forgeType],
        set: {
          name: namespace.name,
          _updatedAt: sql`(strftime('%s', 'now'))`,
        },
      })
      .returning()
      .get();

    const insertedRepository = await tx
      .insert(entities.repositories)
      .values({
        ...repository,
        namespaceId: insertedNamespace.id,
      })
      .onConflictDoUpdate({
        target: [
          entities.repositories.externalId,
          entities.repositories.forgeType,
        ],
        set: {
          name: repository.name,
          namespaceId: insertedNamespace.id,
          defaultBranch: repository.defaultBranch,
          _updatedAt: sql`(strftime('%s', 'now'))`,
        },
      })
      .returning()
      .get();

    return {
      namespace: insertedNamespace,
      repository: insertedRepository,
    };
  });
};

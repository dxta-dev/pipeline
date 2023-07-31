import type { NewNamespace, NewRepository } from "@acme/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { SourceControl } from "@acme/source-control";

export type GetRepositoryInput = {
  externalRepositoryId: number;
  namespaceName: string;
  repositoryName: string;
};

export type GetRepositoryOutput = {
  repository: NewRepository;
  namespace: NewNamespace | null;
};

export type GetRepositorySourceControl = Pick<SourceControl, "fetchRepository">;
export type GetRepositoryEntities = Pick<Entities, "repositories" | "namespaces">;

export type GetRepositoryFunction = ExtractFunction<GetRepositoryInput, GetRepositoryOutput, GetRepositorySourceControl, GetRepositoryEntities>;

export const getRepository: GetRepositoryFunction = async (
  { externalRepositoryId, namespaceName, repositoryName },
  { integrations, db, entities }
) => {
  
  const { repository, namespace } = await integrations.sourceControl.fetchRepository(externalRepositoryId, namespaceName, repositoryName);

  await db.insert(entities.repositories).values(repository)
    .onConflictDoNothing({ target: entities.repositories.externalId })
    .run();

  if (namespace) {
    await db.insert(entities.namespaces).values(namespace)
      .onConflictDoUpdate({ target: entities.namespaces.externalId, set: { name: namespace.name } })
      .run();
  }

  return {
    repository,
    namespace: namespace || null,
  };
};

import type { NewNamespace, NewRepository } from "@acme/extract-schema";
import type { ExtractFunction } from "./config";

export const getRepository: ExtractFunction<{ externalRepositoryId: number }, { repository: NewRepository, namespace: NewNamespace | null }> = async (
  { externalRepositoryId },
  { integrations, db, entities }
) => {

  const { repository, namespace } = await integrations.sourceControl.fetchRepository(externalRepositoryId);

  await db.insert(entities.repositories).values(repository)
    .onConflictDoNothing({ target: entities.repositories.externalId })
    .run();

  if (namespace) {
    await db.insert(entities.namespaces).values(namespace)
      .onConflictDoUpdate({ target: entities.namespaces.externalId, set: entities.namespaces.name })
      .run();
  }

  return {
    repository,
    namespace: namespace || null,
  };
};

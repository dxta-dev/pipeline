import type { ExtractFunction } from "./config";

export const getRepo: ExtractFunction<{ externalRepositoryId: number }, void> = async ({ externalRepositoryId }, { integrations, db, entities }) => {

  const { repository, namespace } = await integrations.sourceControl.getRepo(externalRepositoryId);

  await db.insert(entities.repositories).values(repository)
  .onConflictDoNothing({ target: entities.repositories.externalId })
  .run();

  if (namespace) {
    await db.insert(entities.namespaces).values(namespace)
    .onConflictDoUpdate({ target: entities.namespaces.externalId, set: entities.namespaces.name })
    .run();
  }

  return;
};

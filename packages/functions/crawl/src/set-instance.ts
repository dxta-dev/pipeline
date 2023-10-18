import type { CrawlFunction, Entities } from "./config";

export type SetInstanceInput = {
  repositoryId: number;
  userId: string;
};

export type SetInstaceOutput = {
  instanceId: number;
};

export type SetInstanceEntities = Pick<Entities, "instances">;

export type SetInstanceFunction = CrawlFunction<SetInstanceInput, SetInstaceOutput, SetInstanceEntities>;

export const setInstance: SetInstanceFunction = async (
  { repositoryId, userId },
  { db, entities }
) => {

  const insertedInstance = await db.insert(entities.instances)
    .values({ repositoryId, userId })
    .onConflictDoNothing()
    .returning().get();

  return {
    instanceId: insertedInstance.id,
  };
};

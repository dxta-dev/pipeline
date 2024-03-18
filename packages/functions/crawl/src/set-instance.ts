import type { CrawlFunction, Entities } from "./config";

export type SetInstanceInput = {
  repositoryId: number;
  userId: string;
  since: Date;
  until: Date;
};

export type SetInstaceOutput = {
  instanceId: number;
};

export type SetInstanceEntities = Pick<Entities, "instances">;

export type SetInstanceFunction = CrawlFunction<SetInstanceInput, SetInstaceOutput, SetInstanceEntities>;

export const setInstance: SetInstanceFunction = async (
  { repositoryId, userId, since, until },
  { db, entities }
) => {

  const insertedInstance = await db.insert(entities.instances)
    .values({ 
      repositoryId: repositoryId, 
      userId: userId, 
      since: since,
      until: until
    })
    .onConflictDoNothing()
    .returning().get();

  return {
    instanceId: insertedInstance.id,
  };
};

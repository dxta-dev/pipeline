import { namespaces, repositories } from "@dxta/extract-schema";
import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

export const getRepositories = async (db: LibSQLDatabase) => {
  const repos = await db.select({
    id: repositories.id,
    forge: repositories.forgeType,
    name: repositories.name,
    org: namespaces.name,
    projectId: repositories.externalId,
  }).from(repositories).innerJoin(namespaces, eq(repositories.namespaceId, namespaces.id)).all()
  
  return repos.map(repo=>({
    ...repo,
    key: `${repo.forge}-${repo.projectId}`,
  }));
}
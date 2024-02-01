import { namespaces, repositories } from "@acme/extract-schema";
import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

export const getRepositories = async (db: LibSQLDatabase) => {
  const repos = await db.select({
    forge: repositories.forgeType,
    name: repositories.name,
    org: namespaces.name,
    projectId: repositories.externalId,
  }).from(repositories).innerJoin(namespaces, eq(repositories.namespaceId, namespaces.id)).all()
  
  return repos;
}
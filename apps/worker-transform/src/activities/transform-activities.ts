import { namespaces, repositories } from "@dxta/extract-schema";
import { getTenants as getSuperTenants } from "@dxta/super-schema";
import {
  type ExtractDatabase,
  run,
  selectMergeRequestsDeployments,
  type TenantDatabase,
  type TransformDatabase,
} from "@dxta/transform-functions";
import type {
  TimePeriod,
  ExtractTenantsInput,
  MergeRequestDeploymentPair,
  RepositoryInfo,
  SourceControl,
  Tenant,
  TransformActivities,
} from "@dxta/workflows";
import { eq } from "drizzle-orm";

import { initDatabase, initSuperDatabase } from "../context";

const toDateTimePeriod = (timePeriod: TimePeriod) => ({
  from: new Date(timePeriod.from),
  to: new Date(timePeriod.to),
});

export const transformActivities: TransformActivities = {
  async getTenants(input: ExtractTenantsInput): Promise<Tenant[]> {
    const superDb = initSuperDatabase();
    const allTenants = await getSuperTenants(superDb);

    let filtered = allTenants;
    if (input.tenantId) {
      filtered = filtered.filter((t) => t.id === input.tenantId);
    }

    return filtered.map((t) => ({
      id: t.id,
      name: t.name,
      dbUrl: t.dbUrl,
      crawlUserId: t.crawlUserId,
    }));
  },

  async getRepositoriesForTenant(input: {
    tenantDbUrl: string;
    sourceControl?: SourceControl;
  }): Promise<RepositoryInfo[]> {
    const db = initDatabase(input.tenantDbUrl);
    const repos = await db
      .select({
        id: repositories.id,
        externalId: repositories.externalId,
        name: repositories.name,
        namespaceId: namespaces.id,
        namespaceName: namespaces.name,
        forgeType: repositories.forgeType,
      })
      .from(repositories)
      .innerJoin(namespaces, eq(repositories.namespaceId, namespaces.id))
      .all();

    let filtered = repos.filter((r) => r.forgeType === "github");
    if (input.sourceControl) {
      filtered = filtered.filter((r) => r.forgeType === input.sourceControl);
    }

    return filtered.map((r) => ({
      id: r.id,
      externalId: r.externalId,
      name: r.name,
      namespaceId: r.namespaceId,
      namespaceName: r.namespaceName,
      forgeType: "github",
    }));
  },

  async getMergeRequestDeploymentPairs(
    input,
  ): Promise<MergeRequestDeploymentPair[]> {
    const db = initDatabase(input.tenantDbUrl);
    const timePeriod = toDateTimePeriod(input.timePeriod);
    return selectMergeRequestsDeployments(
      db,
      input.repositoryId,
      timePeriod.from,
      timePeriod.to,
    );
  },

  async transformMergeRequest(input): Promise<void> {
    const db = initDatabase(input.tenantDbUrl);
    await run(input.mergeRequestId, input.deploymentId, {
      extractDatabase: db as unknown as ExtractDatabase,
      transformDatabase: db as unknown as TransformDatabase,
      tenantDatabase: db as unknown as TenantDatabase,
    });
  },
};

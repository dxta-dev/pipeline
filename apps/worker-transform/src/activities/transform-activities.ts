import {
  selectMergeRequestsDeployments,
  run,
  type ExtractDatabase,
  type TransformDatabase,
  type TenantDatabase,
} from "@dxta/transform-functions";
import type {
  TransformActivities,
  MergeRequestDeploymentPair,
} from "@dxta/workflows";

import { initDatabase } from "../context";

export const transformActivities: TransformActivities = {
  async getMergeRequestDeploymentPairs(input): Promise<MergeRequestDeploymentPair[]> {
    const db = initDatabase(input.tenantDbUrl);
    return selectMergeRequestsDeployments(
      db,
      input.repositoryId,
      input.timePeriod.from,
      input.timePeriod.to,
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

import {
  type ExtractDatabase,
  run,
  selectMergeRequestsDeployments,
  type TenantDatabase,
  type TransformDatabase,
} from "@dxta/transform-functions";
import type {
  MergeRequestDeploymentPair,
  TimePeriod,
  TransformActivities,
} from "@dxta/workflows";

import { initDatabase } from "../context";

const toDateTimePeriod = (timePeriod: TimePeriod) => ({
  from: new Date(timePeriod.from),
  to: new Date(timePeriod.to),
});

export const transformActivities: TransformActivities = {
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

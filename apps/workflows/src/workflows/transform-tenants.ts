import { executeChild, proxyActivities } from "@temporalio/workflow";

import type { ExtractActivities } from "../types/activities";
import type { TransformTenantsInput } from "../types/inputs";
import { transformRepositoryWorkflow } from "./transform-repository";

const { getTenants, getRepositoriesForTenant } =
  proxyActivities<ExtractActivities>({
    startToCloseTimeout: "5 minutes",
    retry: {
      initialInterval: "5 seconds",
      backoffCoefficient: 2,
      maximumInterval: "1 minute",
      maximumAttempts: 5,
    },
  });

export async function transformTenantsWorkflow(
  input: TransformTenantsInput,
): Promise<void> {
  const tenants = await getTenants({
    tenantId: input.tenantId,
    timePeriod: input.timePeriod,
  });

  for (const tenant of tenants) {
    if (!tenant.crawlUserId) {
      continue;
    }

    const repositories = await getRepositoriesForTenant({
      tenantDbUrl: tenant.dbUrl,
      sourceControl: "github",
    });

    await Promise.all(
      repositories.map((repo) =>
        executeChild(transformRepositoryWorkflow, {
          args: [
            {
              tenantDbUrl: tenant.dbUrl,
              repositoryId: repo.id,
              timePeriod: input.timePeriod,
            },
          ],
          workflowId: `transform-repo-${tenant.id}-${repo.id}-${input.timePeriod.from.getTime()}`,
        }),
      ),
    );
  }
}

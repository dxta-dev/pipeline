import { executeChild, proxyActivities } from "@temporalio/workflow";

import type { ExtractActivities } from "../types/activities";
import type { ExtractTenantsInput } from "../types/inputs";
import { extractRepositoryWorkflow } from "./extract-repository";

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

export async function extractTenantsWorkflow(
  input: ExtractTenantsInput,
): Promise<void> {
  const tenants = await getTenants(input);

  for (const tenant of tenants) {
    if (!tenant.crawlUserId) {
      continue;
    }

    const repositories = await getRepositoriesForTenant({
      tenantDbUrl: tenant.dbUrl,
      sourceControl: input.sourceControl,
    });

    await Promise.all(
      repositories.map((repo) =>
        executeChild(extractRepositoryWorkflow, {
          args: [
            {
              tenantDbUrl: tenant.dbUrl,
              repositoryId: repo.id,
              externalRepositoryId: repo.externalId,
              repositoryName: repo.name,
              namespaceName: repo.namespaceName,
              namespaceId: repo.namespaceId,
              sourceControl: repo.forgeType,
              userId: tenant.crawlUserId,
              crawlId: 0,
              timePeriod: input.timePeriod,
            },
          ],
          workflowId: `extract-repo-${tenant.id}-${repo.id}-${input.timePeriod.from.getTime()}`,
        }),
      ),
    );
  }
}

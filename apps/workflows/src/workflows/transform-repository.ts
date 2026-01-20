import { proxyActivities } from "@temporalio/workflow";

import type { TransformActivities } from "../types/activities";
import type { TransformRepositoryInput } from "../types/inputs";

const { getMergeRequestDeploymentPairs, transformMergeRequest } =
  proxyActivities<TransformActivities>({
    startToCloseTimeout: "10 minutes",
    retry: {
      initialInterval: "5 seconds",
      backoffCoefficient: 2,
      maximumInterval: "1 minute",
      maximumAttempts: 10,
    },
  });

export async function transformRepositoryWorkflow(
  input: TransformRepositoryInput,
): Promise<void> {
  const pairs = await getMergeRequestDeploymentPairs(input);

  await Promise.all(
    pairs.map((pair) =>
      transformMergeRequest({
        tenantDbUrl: input.tenantDbUrl,
        mergeRequestId: pair.mergeRequestId,
        deploymentId: pair.deploymentId,
      }),
    ),
  );
}

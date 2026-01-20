import { executeChild, proxyActivities } from "@temporalio/workflow";

import type { ExtractActivities } from "../types/activities";
import type { ExtractRepositoryInput } from "../types/inputs";
import { extractMergeRequestWorkflow } from "./extract-merge-request";

const DEFAULT_PER_PAGE = 30;

const {
  extractRepository,
  extractMergeRequests,
  extractMembers,
  extractMemberInfo,
  extractNamespaceMembers,
  extractDeployments,
  extractDeploymentStatus,
  extractDefaultBranchCommits,
  extractWorkflowDeployments,
  extractWorkflowDeploymentStatus,
} = proxyActivities<ExtractActivities>({
  startToCloseTimeout: "10 minutes",
  retry: {
    initialInterval: "5 seconds",
    backoffCoefficient: 2,
    maximumInterval: "1 minute",
    maximumAttempts: 10,
  },
});

export async function extractRepositoryWorkflow(
  input: ExtractRepositoryInput,
): Promise<void> {
  const result = await extractRepository(input);
  const { crawlId, mergeRequestIds } = result;

  const baseInput = {
    tenantId: input.tenantId,
    tenantDbUrl: input.tenantDbUrl,
    repositoryId: input.repositoryId,
    namespaceId: input.namespaceId,
    sourceControl: input.sourceControl,
    userId: input.userId,
    crawlId,
    timePeriod: input.timePeriod,
  };

  await Promise.all([
    extractMergeRequestsAndChildren(baseInput, input, mergeRequestIds),
    extractMembersAndInfo(baseInput, input),
    extractDeploymentsAndStatus(baseInput, input),
    input.sourceControl === "github"
      ? extractGitHubSpecific(baseInput, input)
      : Promise.resolve(),
  ]);
}

async function extractMergeRequestsAndChildren(
  baseInput: {
    tenantId: number;
    tenantDbUrl: string;
    repositoryId: number;
    namespaceId: number;
    sourceControl: "github";
    userId: string;
    crawlId: number;
    timePeriod: { from: Date; to: Date };
  },
  input: ExtractRepositoryInput,
  initialMergeRequestIds: number[],
): Promise<void> {
  const firstPageResult = await extractMergeRequests({
    ...baseInput,
    externalRepositoryId: input.externalRepositoryId,
    repositoryName: input.repositoryName,
    namespaceName: input.namespaceName,
    page: 1,
    perPage: DEFAULT_PER_PAGE,
  });

  const allMergeRequestIds = [...initialMergeRequestIds];

  if (firstPageResult.totalPages > 1) {
    const remainingPages: number[] = [];
    for (let page = 2; page <= firstPageResult.totalPages; page++) {
      remainingPages.push(page);
    }

    const pageResults = await Promise.all(
      remainingPages.map((page) =>
        extractMergeRequests({
          ...baseInput,
          externalRepositoryId: input.externalRepositoryId,
          repositoryName: input.repositoryName,
          namespaceName: input.namespaceName,
          page,
          perPage: DEFAULT_PER_PAGE,
        }),
      ),
    );

    for (const pageResult of pageResults) {
      allMergeRequestIds.push(...pageResult.mergeRequestIds);
    }
  }

  allMergeRequestIds.push(...firstPageResult.mergeRequestIds);

  const uniqueMergeRequestIds = [...new Set(allMergeRequestIds)];

  await Promise.all(
    uniqueMergeRequestIds.map((mergeRequestId) =>
      executeChild(extractMergeRequestWorkflow, {
        args: [
          {
            ...baseInput,
            mergeRequestId,
          },
        ],
        workflowId: `extract-mr-${input.repositoryId}-${mergeRequestId}`,
      }),
    ),
  );
}

async function extractMembersAndInfo(
  baseInput: {
    tenantId: number;
    tenantDbUrl: string;
    repositoryId: number;
    namespaceId: number;
    sourceControl: "github";
    userId: string;
    crawlId: number;
    timePeriod: { from: Date; to: Date };
  },
  input: ExtractRepositoryInput,
): Promise<void> {
  const membersResult = await extractMembers({
    ...baseInput,
    externalRepositoryId: input.externalRepositoryId,
    repositoryName: input.repositoryName,
    namespaceName: input.namespaceName,
  });

  await Promise.all(
    membersResult.memberIds.map((memberId) =>
      extractMemberInfo({
        tenantId: baseInput.tenantId,
        tenantDbUrl: input.tenantDbUrl,
        memberId,
        sourceControl: input.sourceControl,
        userId: input.userId,
      }),
    ),
  );

  await extractNamespaceMembers({
    tenantId: baseInput.tenantId,
    tenantDbUrl: input.tenantDbUrl,
    namespaceId: input.namespaceId,
    namespaceName: input.namespaceName,
    repositoryId: input.repositoryId,
    sourceControl: input.sourceControl,
    userId: input.userId,
    crawlId: baseInput.crawlId,
  });
}

async function extractDeploymentsAndStatus(
  baseInput: {
    tenantId: number;
    tenantDbUrl: string;
    repositoryId: number;
    namespaceId: number;
    sourceControl: "github";
    userId: string;
    crawlId: number;
    timePeriod: { from: Date; to: Date };
  },
  input: ExtractRepositoryInput,
): Promise<void> {
  const deploymentsResult = await extractDeployments({
    ...baseInput,
    externalRepositoryId: input.externalRepositoryId,
    repositoryName: input.repositoryName,
    namespaceName: input.namespaceName,
  });

  await Promise.all(
    deploymentsResult.deploymentIds.map((deploymentId) =>
      extractDeploymentStatus({
        tenantId: baseInput.tenantId,
        tenantDbUrl: input.tenantDbUrl,
        repositoryId: input.repositoryId,
        namespaceId: input.namespaceId,
        deploymentId,
        sourceControl: input.sourceControl,
        userId: input.userId,
      }),
    ),
  );
}

async function extractGitHubSpecific(
  baseInput: {
    tenantId: number;
    tenantDbUrl: string;
    repositoryId: number;
    namespaceId: number;
    sourceControl: "github";
    userId: string;
    crawlId: number;
    timePeriod: { from: Date; to: Date };
  },
  input: ExtractRepositoryInput,
): Promise<void> {
  await extractDefaultBranchCommits({
    ...baseInput,
    externalRepositoryId: input.externalRepositoryId,
    repositoryName: input.repositoryName,
    namespaceName: input.namespaceName,
  });

  const workflowDeploymentsResult = await extractWorkflowDeployments({
    tenantId: baseInput.tenantId,
    tenantDbUrl: input.tenantDbUrl,
    repositoryId: input.repositoryId,
    externalRepositoryId: input.externalRepositoryId,
    repositoryName: input.repositoryName,
    namespaceId: input.namespaceId,
    namespaceName: input.namespaceName,
    userId: input.userId,
    crawlId: baseInput.crawlId,
    timePeriod: input.timePeriod,
  });

  await Promise.all(
    workflowDeploymentsResult.deploymentIds.map((deploymentId) =>
      extractWorkflowDeploymentStatus({
        tenantId: baseInput.tenantId,
        tenantDbUrl: input.tenantDbUrl,
        repositoryId: input.repositoryId,
        namespaceId: input.namespaceId,
        deploymentId,
        userId: input.userId,
      }),
    ),
  );
}

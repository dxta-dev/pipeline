export interface Tenant {
  id: number;
  name: string;
  dbUrl: string;
  crawlUserId: string;
}

export interface RepositoryInfo {
  id: number;
  externalId: number;
  name: string;
  namespaceId: number;
  namespaceName: string;
  forgeType: "github";
}

export interface ExtractRepositoryResult {
  repositoryId: number;
  namespaceId: number;
  crawlId: number;
  mergeRequestIds: number[];
}

export interface ExtractMergeRequestsResult {
  mergeRequestIds: number[];
  totalPages: number;
}

export interface ExtractMembersResult {
  memberIds: number[];
  totalPages: number;
}

export interface ExtractDeploymentsResult {
  deploymentIds: number[];
}

export interface ExtractWorkflowDeploymentsResult {
  deploymentIds: number[];
}

export interface ExtractWorkflowDeploymentInput {
  tenantId: number;
  tenantDbUrl: string;
  repositoryId: number;
  externalRepositoryId: number;
  repositoryName: string;
  namespaceId: number;
  namespaceName: string;
  userId: string;
  crawlId: number;
  timePeriod: { from: number; to: number };
}

// Transform results

export interface MergeRequestDeploymentPair {
  mergeRequestId: number;
  deploymentId: number | null;
}

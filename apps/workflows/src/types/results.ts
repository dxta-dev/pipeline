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

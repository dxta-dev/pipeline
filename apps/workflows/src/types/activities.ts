import type {
  ExtractDeploymentsInput,
  ExtractMembersInput,
  ExtractMergeRequestInput,
  ExtractRepositoryInput,
  ExtractTenantsInput,
  SourceControl,
  TimePeriod,
} from "./inputs";
import type {
  ExtractDeploymentsResult,
  ExtractMembersResult,
  ExtractMergeRequestsResult,
  ExtractRepositoryResult,
  RepositoryInfo,
  Tenant,
} from "./results";

export interface ExtractActivities {
  getTenants(input: ExtractTenantsInput): Promise<Tenant[]>;

  getRepositoriesForTenant(input: {
    tenantDbUrl: string;
    sourceControl?: SourceControl;
  }): Promise<RepositoryInfo[]>;

  extractRepository(input: ExtractRepositoryInput): Promise<ExtractRepositoryResult>;

  extractMergeRequests(input: {
    tenantDbUrl: string;
    repositoryId: number;
    externalRepositoryId: number;
    repositoryName: string;
    namespaceId: number;
    namespaceName: string;
    sourceControl: SourceControl;
    userId: string;
    crawlId: number;
    timePeriod: TimePeriod;
    page: number;
    perPage: number;
  }): Promise<ExtractMergeRequestsResult>;

  extractMergeRequestDiffs(input: ExtractMergeRequestInput): Promise<void>;

  extractMergeRequestCommits(input: ExtractMergeRequestInput): Promise<void>;

  extractMergeRequestNotes(input: ExtractMergeRequestInput): Promise<void>;

  extractTimelineEvents(input: ExtractMergeRequestInput): Promise<void>;

  extractMembers(input: ExtractMembersInput): Promise<ExtractMembersResult>;

  extractMemberInfo(input: {
    tenantDbUrl: string;
    memberId: number;
    sourceControl: SourceControl;
    userId: string;
  }): Promise<void>;

  extractNamespaceMembers(input: {
    tenantDbUrl: string;
    namespaceId: number;
    namespaceName: string;
    repositoryId: number;
    sourceControl: SourceControl;
    userId: string;
    crawlId: number;
  }): Promise<void>;

  extractDeployments(input: ExtractDeploymentsInput): Promise<ExtractDeploymentsResult>;

  extractDeploymentStatus(input: {
    tenantDbUrl: string;
    repositoryId: number;
    namespaceId: number;
    deploymentId: number;
    sourceControl: SourceControl;
    userId: string;
  }): Promise<void>;

  extractDefaultBranchCommits(input: {
    tenantDbUrl: string;
    repositoryId: number;
    externalRepositoryId: number;
    repositoryName: string;
    namespaceId: number;
    namespaceName: string;
    sourceControl: SourceControl;
    userId: string;
    crawlId: number;
    timePeriod: TimePeriod;
  }): Promise<void>;

  extractWorkflowDeployments(input: {
    tenantDbUrl: string;
    repositoryId: number;
    externalRepositoryId: number;
    repositoryName: string;
    namespaceId: number;
    namespaceName: string;
    userId: string;
    crawlId: number;
    timePeriod: TimePeriod;
  }): Promise<void>;

  extractWorkflowDeploymentStatus(input: {
    tenantDbUrl: string;
    repositoryId: number;
    namespaceId: number;
    deploymentId: number;
    userId: string;
  }): Promise<void>;
}

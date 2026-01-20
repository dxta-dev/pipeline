export type SourceControl = "github" | "gitlab";

export interface TimePeriod {
  from: Date;
  to: Date;
}

export interface ExtractTenantsInput {
  tenantId?: number;
  sourceControl?: SourceControl;
  timePeriod: TimePeriod;
}

export interface ExtractRepositoryInput {
  tenantDbUrl: string;
  repositoryId: number;
  externalRepositoryId: number;
  repositoryName: string;
  namespaceName: string;
  namespaceId: number;
  sourceControl: SourceControl;
  userId: string;
  crawlId: number;
  timePeriod: TimePeriod;
}

export interface ExtractMergeRequestInput {
  tenantDbUrl: string;
  repositoryId: number;
  namespaceId: number;
  mergeRequestId: number;
  sourceControl: SourceControl;
  userId: string;
  crawlId: number;
  timePeriod: TimePeriod;
}

export interface ExtractMembersInput {
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
}

export interface ExtractDeploymentsInput {
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
}

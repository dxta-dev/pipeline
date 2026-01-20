export type SourceControl = "github";

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
  tenantId: number;
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
  tenantId: number;
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
  tenantId: number;
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
  tenantId: number;
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

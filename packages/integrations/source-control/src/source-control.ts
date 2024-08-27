import type { NewRepository, NewNamespace, NewMergeRequestWithSha, NewMember, NewMergeRequestDiff, NewMergeRequestCommit, NewMergeRequestNote, NewTimelineEvents, NewCommit, NewDeploymentWithSha, Deployment } from "@dxta/extract-schema";
import type { Repository, Namespace, MergeRequest } from "@dxta/extract-schema";

export type Pagination = {
  perPage: number;
  page: number;
  totalPages: number;
};

export type TimePeriod = {
  from: Date;
  to: Date;
}

export type CommitData = {
  commit: Omit<NewCommit, 'repositoryId' | 'repositoryShaId'>,
  id: string,
  parents: string[]
}

export interface SourceControl {
  fetchRepository(externalRepositoryId: number, namespaceName: string, repositoryName: string): Promise<{ repository: Omit<NewRepository, "namespaceId">, namespace: NewNamespace }>;
  fetchMembers(externalRepositoryId: number, namespaceName: string, repositoryName: string, perPage: number, page?: number): Promise<{ members: NewMember[], pagination: Pagination }>;
  fetchNamespaceMembers(externalNamespaceId: number, namespaceName: string, perPage: number, page?: number): Promise<{ members: NewMember[], pagination: Pagination }>;
  fetchUserInfo(externalId: number, username: string): Promise<{ member: NewMember }>;
  fetchMergeRequests(externalRepositoryId: number, namespaceName: string, repositoryName: string, repositoryId: number, perPage: number, creationPeriod?: TimePeriod, page?: number, totalPages?: number): Promise<{ mergeRequests: NewMergeRequestWithSha[], pagination: Pagination }>;
  fetchMergeRequestDiffs(repository: Repository, namespace: Namespace, mergeRequest: MergeRequest, perPage: number, page?: number): Promise<{ mergeRequestDiffs: NewMergeRequestDiff[], pagination: Pagination }>;
  fetchMergeRequestCommits(repository: Repository, namespace: Namespace, mergeRequest: MergeRequest): Promise<{ mergeRequestCommits: NewMergeRequestCommit[] }>;
  fetchMergeRequestNotes(repository: Repository, namespace: Namespace, mergeRequest: MergeRequest): Promise<{ mergeRequestNotes: NewMergeRequestNote[] }>
  fetchTimelineEvents(repository: Repository, namespace: Namespace, mergeRequest: MergeRequest): Promise<{ timelineEvents: NewTimelineEvents[] }>;
  fetchCommits(repository: Repository, namespace: Namespace, perPage: number, ref?: string, period?: TimePeriod, page?: number): Promise<{commits: CommitData[], pagination: Pagination}>;
  fetchDeployments(repository: Repository, namespace: Namespace, perPage: number, environment?: string, page?: number): Promise<{ deployments: NewDeploymentWithSha[], pagination: Pagination }>;
  fetchDeployment(repository: Repository, namespace: Namespace, deployment: Deployment): Promise<{ deployment: Deployment }>;

  fetchWorkflowDeployments(repository: Repository, namespace: Namespace, workflowId: number, timePeriod: TimePeriod, perPage: number, branch?: string, page?: number): Promise<{ deployments: NewDeploymentWithSha[], pagination: Pagination }>;
}

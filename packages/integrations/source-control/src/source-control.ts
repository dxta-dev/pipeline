import type { NewRepository, NewNamespace, NewMergeRequest, NewMember, NewMergeRequestDiff, NewMergeRequestCommit, NewMergeRequestNote, NewTimelineEvents, NewDeployment } from "@dxta/extract-schema";
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

export interface SourceControl {
  fetchRepository(externalRepositoryId: number, namespaceName: string, repositoryName: string): Promise<{ repository: Omit<NewRepository, "namespaceId">, namespace: NewNamespace }>;
  fetchMembers(externalRepositoryId: number, namespaceName: string, repositoryName: string, perPage: number, page?: number): Promise<{ members: NewMember[], pagination: Pagination }>;
  fetchNamespaceMembers(externalNamespaceId: number, namespaceName: string, perPage: number, page?: number): Promise<{ members: NewMember[], pagination: Pagination }>;
  fetchUserInfo(externalId: number, username: string): Promise<{ member: NewMember }>;
  fetchMergeRequests(externalRepositoryId: number, namespaceName: string, repositoryName: string, repositoryId: number, perPage: number, creationPeriod?: TimePeriod, page?: number, totalPages?: number): Promise<{ mergeRequests: NewMergeRequest[], pagination: Pagination }>;
  fetchMergeRequestDiffs(repository: Repository, namespace: Namespace, mergeRequest: MergeRequest, perPage: number, page?: number): Promise<{ mergeRequestDiffs: NewMergeRequestDiff[], pagination: Pagination }>;
  fetchMergeRequestCommits(repository: Repository, namespace: Namespace, mergeRequest: MergeRequest): Promise<{ mergeRequestCommits: NewMergeRequestCommit[] }>;
  fetchMergeRequestNotes(repository: Repository, namespace: Namespace, mergeRequest: MergeRequest): Promise<{ mergeRequestNotes: NewMergeRequestNote[] }>
  fetchTimelineEvents(repository: Repository, namespace: Namespace, mergeRequest: MergeRequest): Promise<{ timelineEvents: NewTimelineEvents[] }>;
  fetchDeployments(externalRepositoryId: number, namespaceName: string, repositoryName: string, repositoryId: number, perPage: number, page?:number): Promise<{deployments: NewDeployment[], pagination: Pagination}>;
}

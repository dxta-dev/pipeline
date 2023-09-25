import type { NewRepository, NewNamespace, NewMergeRequest, NewMember, NewMergeRequestDiff, NewMergeRequestCommit, NewMergeRequestNote } from "@acme/extract-schema";
import type { Repository, Namespace, MergeRequest } from "@acme/extract-schema";

export type Pagination = {
  page: number;
  perPage: number;
  totalPages: number;
};

export type TimePeriod = {
  from?: Date;
  to?: Date;
}

export interface SourceControl {
  fetchRepository(externalRepositoryId: number, namespaceName: string, repositoryName: string): Promise<{ repository: NewRepository, namespace: NewNamespace }>;
  fetchMembers(externalRepositoryId: number, namespaceName: string, repositoryName: string, page?: number, perPage?: number): Promise<{ members: NewMember[], pagination: Pagination }>;
  fetchNamespaceMembers(externalNamespaceId: number, namespaceName: string, page?: number, perPage?: number): Promise<{ members: NewMember[], pagination: Pagination }>;
  fetchUserInfo(externalId: number, username: string): Promise<{ member: NewMember }>;
  fetchMergeRequests(externalRepositoryId: number, namespaceName: string, repositoryName: string, repositoryId: number, creationPeriod?: TimePeriod, page?: number, perPage?: number): Promise<{ mergeRequests: NewMergeRequest[], pagination: Pagination }>;
  fetchMergeRequestDiffs(repository: Repository, namespace: Namespace, mergeRequest: MergeRequest, page?: number, perPage?: number): Promise<{ mergeRequestDiffs: NewMergeRequestDiff[], pagination: Pagination }>;
  fetchMergeRequestCommits(repository: Repository, namespace: Namespace, mergeRequest: MergeRequest, creationPeriod?: TimePeriod): Promise<{ mergeRequestCommits: NewMergeRequestCommit[] }>;
  fetchMergeRequestNotes(repository: Repository, namespace: Namespace, mergeRequest: MergeRequest): Promise<{ mergeRequestNotes: NewMergeRequestNote[] }>
}

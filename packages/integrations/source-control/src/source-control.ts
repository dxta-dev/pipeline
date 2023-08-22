import type { NewRepository, NewNamespace, NewMergeRequest, NewMember, NewMergeRequestDiff, NewMergeRequestCommit } from "@acme/extract-schema";
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
  fetchRepository(externalRepositoryId: number, namespaceName: string, repositoryName: string): Promise<{ repository: NewRepository, namespace?: NewNamespace }>;
  fetchMembers(externalRepositoryId: number, namespaceName: string, repositoryName: string, page?: number, perPage?: number): Promise<{ members: NewMember[], pagination: Pagination }>;
  fetchMergeRequests(externalRepositoryId: number, namespaceName: string, repositoryName: string, repositoryId: number, creationPeriod?: TimePeriod, page?: number, perPage?: number): Promise<{ mergeRequests: NewMergeRequest[], pagination: Pagination }>;
  fetchMergeRequestDiffs(repository: Repository, namespace: Namespace, mergeRequest: MergeRequest, page?: number, perPage?: number): Promise<{ mergeRequestDiffs: NewMergeRequestDiff[], pagination: Pagination }>;
  fetchMergeRequestCommits(externalRepositoryId: number, namespaceName: string, repositoryName: string, mergeRequestIId: number, creationPeriod?: TimePeriod): Promise<{ mergeRequestCommits: NewMergeRequestCommit[]}>;
}

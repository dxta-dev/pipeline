import type { NewRepository, NewNamespace, NewMergeRequest } from "@acme/extract-schema";

export type Pagination = {
  page: number;
  perPage: number;
  totalPages: number;
};

export type RepositoryWithNamespace = {
  repository: NewRepository,
  namespace: NewNamespace
}

export interface SourceControl {
  fetchRepository(externalRepositoryId: number, namespaceName: string, repositoryName: string): Promise<{ repository: NewRepository, namespace?: NewNamespace }>;
  fetchMergeRequests(externalRepositoryId: number, namespaceName: string, repositoryName: string, page?: number, perPage?: number): Promise<{ mergeRequests: NewMergeRequest[], pagination: Pagination }>;
}

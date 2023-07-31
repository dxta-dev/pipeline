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
  fetchRepositoriesWithNamespaces(perPage?: number, page?: number): Promise<{ repositoriesAndNamespaces: RepositoryWithNamespace[], pagination: Pagination }>;
  fetchRepository(externalRepositoryId: number): Promise<{ repository: NewRepository, namespace?: NewNamespace }>;
  fetchMergeRequests(externalRepositoryId: number, page?: number, perPage?: number): Promise<{ mergeRequests: NewMergeRequest[], pagination: Pagination }>;
}

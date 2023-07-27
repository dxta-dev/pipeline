import type { NewRepository, NewNamespace } from "@acme/extract-schema";

export type Pagination = {
  page: number;
  perPage: number;
  totalPages: number;
};

export interface SourceControl {
  fetchRepository(externalRepositoryId: number): Promise<{ repository: NewRepository, namespace?: NewNamespace }>;
  fetchMergeRequests(externalRepositoryId: number, page?: number, perPage?: number): Promise<{ mergeRequests: NewMergeRequest[], pagination: Pagination }>;
}

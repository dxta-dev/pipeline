import { type NewRepository, type NewNamespace, type NewMergeRequest, type NewMember, type NewMergeRequestDiff, type NewMergeRequestCommit, type NewMergeRequestNote, type NewTimelineEvents, type NewCicdWorkflow, NewCicdRun } from "@dxta/extract-schema";
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

  fetchCicdWorkflows(repository: Repository, namespace: Namespace, perPage: number, page?: number): Promise<{ cicdWorkflows: NewCicdWorkflow[], pagination: Pagination }>;
  fetchCicdWorkflowRuns(repository: Repository, namespace: Namespace, workflowId: number, timePeriod: TimePeriod, perPage: number, page?: number): Promise<{cicdRuns: NewCicdRun[], pagination: Pagination}>;
}

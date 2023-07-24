import type { NewRepository, NewNamespace } from "@acme/extract-schema";

export interface SourceControl {
  fetchRepository(externalRepositoryId: number): Promise<{ repository: NewRepository, namespace?: NewNamespace }>;
}

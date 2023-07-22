import type { NewRepository, NewNamespace } from "@acme/extract-schema";

export interface SourceControl {
  getRepo(externalRepositoryId: number): Promise<{ repository: NewRepository, namespace?: NewNamespace }>;
}

export class GithubSourceControl implements SourceControl {
  constructor() {
    throw new Error("Not implemented");
  }
  async getRepo(externalRepositoryId: number): Promise<{ repository: NewRepository, namespace?: NewNamespace }> {
    throw new Error("Method not implemented.");
  }
}

export class GitlabSourceControl implements SourceControl {
  constructor() {
    throw new Error("Not implemented");
  }
  async getRepo(externalRepositoryId: number): Promise<{ repository: NewRepository, namespace?: NewNamespace }> {
    throw new Error("Method not implemented."); 
  }
}

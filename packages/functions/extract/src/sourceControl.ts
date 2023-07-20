import type { SourceControl } from "./config";


class GitlabSourceControl implements SourceControl {
  constructor() {
  }
  async getRepo(externalRepositoryId: number): Promise<{ repository: NewRepository, namespace?: NewNamespace }> {
     
  }
}

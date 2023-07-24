import type { SourceControl } from "../source-control";
import type { Gitlab as GitlabType } from '@gitbeaker/core';
import type { NewRepository, NewNamespace } from "@acme/extract-schema";
import { Gitlab } from '@gitbeaker/rest';

export class GitlabSourceControl implements SourceControl {
  private api: GitlabType<true>;

  constructor(token: string) {
    this.api = new Gitlab({
      token,
      camelize: true,
    });
  }

  async getRepo(externalRepositoryId: number): Promise<{ repository: NewRepository, namespace?: NewNamespace }> {
    const project = await this.api.Projects.show(externalRepositoryId);
    const namespace = project.namespace;

    return {
      repository: {
        externalId: project.id,
      } satisfies NewRepository,
      namespace: {
        externalId: namespace.id,
        name: namespace.name,
      } satisfies NewNamespace,
    };
  }
}

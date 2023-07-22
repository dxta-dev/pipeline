
import type { Gitlab } from '@gitbeaker/core';
import type { NewRepository, NewNamespace } from '@acme/extract-schema';

export default async function getProject(api: Gitlab<true>, { externalProjectId }: { externalProjectId: number }): Promise<{ repository: NewRepository, namespace: NewNamespace }> {
  const project = await api.Projects.show(externalProjectId);
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

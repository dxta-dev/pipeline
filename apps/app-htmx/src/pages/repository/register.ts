import type { RouteHandlerMethod } from "fastify";
import { getAuth } from "@clerk/fastify"
import { z } from "zod";
import { tenantListContext } from "src/context/tenant-list.context";
import { type GetRepositoryFunction, getRepository } from "@acme/extract-functions";
import { namespaces, repositories } from "@acme/extract-schema";
import { extractContext } from "src/functions/extract-context";

const RegisterInput = z.object({
  target_tenant_id: z.coerce.number(),
  forge: z.literal("github").or(z.literal("gitlab")),
  owner: z.string().optional(),
  repo: z.string().optional(),
  project_id: z.string().optional()
})

const getRepositoryEntitiesContext = {
  entities: {
    namespaces: namespaces,
    repositories: repositories,
  },
} satisfies Pick<Parameters<GetRepositoryFunction>[1], 'entities'>;

export const RegisterRepository: RouteHandlerMethod = async (request, reply) => {
  const auth = getAuth(request);
  if (!auth.userId) return reply.status(404).send(); // hide actions from unauthenticated users  

  const { tenantList } = tenantListContext();

  const safeInput = RegisterInput.safeParse(request.body);
  if (!safeInput.success) return reply.status(400).send();

  const targetTenantId = safeInput.data.target_tenant_id;
  const tenant = tenantList.find(tenant => tenant.id === targetTenantId);
  if (!tenant) return reply.view("component.log.html", { error: `Invalid target_tenant_id: ${targetTenantId}` });
  
  const { userId } = auth;
  const { forge } = safeInput.data;
  
  const input = {
    externalRepositoryId: Number(safeInput.data.project_id) || 0,
    namespaceName: safeInput.data.owner || "",
    repositoryName: safeInput.data.repo || "",
  }

  const getRepositoryContext = await extractContext({ tenant, userId, forge }, getRepositoryEntitiesContext);

  try {    
    const { repository, namespace } = await getRepository(input, getRepositoryContext);

    if (repository._createdAt?.getTime() !== repository._updatedAt?.getTime()) {
      return reply.view("component.log.html", { log: `Repository : ${namespace.name}/${repository.name} is already registered.` });
    }

    const repo = {
      key: `${forge}-${repository.externalId}`,
      name: repository.name,
      org: namespace.name,
      forge,
      projectId: repository.externalId,
    }

    return reply.view("component.repository.html", {
      repo,
      tenant,
      dates: {
        yesterday: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0, 10),
        today: new Date().toISOString().slice(0, 10)
      }
    });
  
  } catch (error) {
    console.log(error);
    const errorMessage = error instanceof Error? error.message : error;
    return reply.view("component.log.html", { error: errorMessage });
  }

}
import type { RouteHandlerMethod } from "fastify";
import { getAuth } from "@clerk/fastify"
import { z } from "zod";
import { tryFetchRepository } from "src/functions/fetch-repository";
import { tenantListContext } from "src/context/tenant-list.context";

const RegisterInput = z.object({
  target_tenant_id: z.coerce.number(),
  forge: z.literal("github").or(z.literal("gitlab")),
  owner: z.string().optional(),
  repo: z.string().optional(),
  project_id: z.string().optional()
})

export const RegisterRepository: RouteHandlerMethod = async (request, reply) => {
  const auth = getAuth(request);
  if (!auth.userId) return reply.status(404).send(); // hide actions from unauthenticated users  

  const { tenantList } = tenantListContext();

  const safeInput = RegisterInput.safeParse(request.body);
  if (!safeInput.success) return reply.status(400).send();

  const input = {
    userId: auth.userId,
    forge: safeInput.data.forge,
    namespaceName: safeInput.data.owner || "",
    repositoryName: safeInput.data.repo || "",
    repositoryId: Number(safeInput.data.project_id) || 0
  }

  const { repository, namespace } = await tryFetchRepository(input);

  if (!repository || !namespace) return reply.view("component.log.html",
    safeInput.data.forge === "github" ? { error: `Repository ${input.namespaceName}/${input.repositoryName} not found` }
      : { error: `Project ${input.repositoryId} not found` });

  const targetTenantId = safeInput.data.target_tenant_id;
  const tenant = tenantList.find(tenant=>tenant.id === targetTenantId);
  if (!tenant) return reply.view("component.log.html", { error: `Invalid target_tenant_id: ${targetTenantId}` });

  const repo = {
    name: repository.name,
    org: namespace.name,
    forge: repository.forgeType,
    projectId: repository.externalId
  }
  
  return reply.view("component.repository.html", {
    repo,
    targetTenantId,
    dates: {
      yesterday: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0, 10),
      today: new Date().toISOString().slice(0, 10)
    }
  });
}
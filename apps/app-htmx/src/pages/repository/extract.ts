import type { RouteHandlerMethod } from "fastify";
import { clerkClient, getAuth } from "@clerk/fastify"
import { z } from "zod";
import { tenantListContext } from "src/context/tenant-list.context";
import { AppConfig } from "src/app-config";

const ExtractInputSchema = z.object({
  target_tenant_id: z.coerce.number(),
  forge: z.literal("github").or(z.literal("gitlab")),
  owner: z.string().optional(),
  repo: z.string().optional(),
  project_id: z.coerce.number().optional()
}).and(z.discriminatedUnion("qtype", [
  z.object({
    qtype: z.literal('last'),
    last: z.coerce.number(),
  }),
  z.object({
    qtype: z.literal('between'),
    from: z.coerce.date(),
    to: z.coerce.date(),
  })
]));

export const ExtractRepository: RouteHandlerMethod = async (request, reply) => {
  const auth = getAuth(request);
  const {tenantList} = tenantListContext();
  if (!auth.userId) return reply.status(404).send();
  const parsedExtractInput = ExtractInputSchema.safeParse(request.body);

  if (!parsedExtractInput.success) return reply.view("component.log.html", { error: parsedExtractInput.error });

  const extractInput = parsedExtractInput.data;
  const tenant = tenantList.find(tenant=>tenant.id === extractInput.target_tenant_id);
  if (!tenant) return reply.view("component.log.html", { error: `Invalid target_tenant_id: ${extractInput.target_tenant_id}` });

  let to = new Date();
  let from = new Date(to);
  if (extractInput.qtype === 'last') from.setDate(to.getDate() - extractInput.last);
  if (extractInput.qtype === 'between') {
    from = extractInput.from;
    to = extractInput.to;
    // from.setUTCHours(0, 0, 0, 0);
    // to.setUTCHours(23, 59, 59, 999);
  }

  const requestBody = JSON.stringify({
    repositoryId: extractInput.project_id || 0,
    repositoryName: extractInput.repo || "",
    namespaceName: extractInput.owner || "",
    sourceControl: extractInput.forge,
    from,
    to,
    tenantId: tenant.id,
  });

  const apiToken = await clerkClient.sessions.getToken(auth.sessionId, "dashboard") as string;

  const res = await fetch(AppConfig.apis.extractStart, {
    method: 'post',
    body: requestBody,
    headers: {
      'Authorization': 'Bearer ' + apiToken
    }
  });

  const body = await res.text();

  if (res.status !== 200) return reply.view('component.log.html', { error: body });

  return reply.view('component.log.html', { log: body });  
}
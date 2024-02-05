import type { RouteHandlerMethod } from "fastify";
import { clerkClient, getAuth } from "@clerk/fastify"
import { z } from "zod";
import { tenantListContext } from "src/context/tenant-list.context";
import { AppConfig } from "src/app-config";

const TransformInputSchema = z.object({
  target_tenant_id: z.coerce.number(),
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

export const StartTransform: RouteHandlerMethod = async (request, reply) => {
  const auth = getAuth(request);
  const { tenantList } = tenantListContext();
  if (!auth.userId) return reply.status(404).send();
  const parsedTransformInput = TransformInputSchema.safeParse(request.body);

  if (!parsedTransformInput.success) return reply.view("component.log.html", { error: parsedTransformInput.error });

  const extractInput = parsedTransformInput.data;
  const tenant = tenantList.find(tenant => tenant.id === extractInput.target_tenant_id);
  if (!tenant) return reply.view("component.log.html", { error: `Invalid target_tenant_id: ${extractInput.target_tenant_id}` });

  const apiToken = await clerkClient.sessions.getToken(auth.sessionId, "dashboard") as string;

  let to = new Date();
  let from = new Date(to);
  if (extractInput.qtype === 'last') from.setDate(to.getDate() - extractInput.last);
  if (extractInput.qtype === 'between') {
    from = extractInput.from;
    to = extractInput.to;
  }

  const requestBody = JSON.stringify({ tenantId: tenant.id, from, to });
  
  const res = await fetch(AppConfig.apis.transformStart, {
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

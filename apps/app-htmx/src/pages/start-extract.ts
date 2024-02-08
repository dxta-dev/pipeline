import { clerkClient, getAuth } from "@clerk/fastify";
import type { RouteHandlerMethod } from "fastify";
import { AppConfig } from "src/app-config";
import { tenantListContext } from "src/context/tenant-list.context";
import { z } from "zod";

const QuerySchema = z.object({
  tenant: z.string(),
});

const InputSchema = z.discriminatedUnion("qtype", [
  z.object({
    qtype: z.literal('last'),
    last: z.coerce.number(),
  }),
  z.object({
    qtype: z.literal('between'),
    from: z.coerce.date(),
    to: z.coerce.date(),
  })
]);

export const StartExtract: RouteHandlerMethod = async (request, reply) => {
  const auth = getAuth(request);
  if (!auth.userId) return reply.status(404).send();  
  
  const parsedQuery = QuerySchema.safeParse(request.query);
  if (!parsedQuery.success) return reply.status(400).send();

  const { tenant: tenantKey } = parsedQuery.data;
  const { tenantList } = tenantListContext();
  const tenant = tenantList.find(tenant => tenant.name === tenantKey);
  if (!tenant) return reply.status(400).send();

  const apiToken = await clerkClient.sessions.getToken(auth.sessionId, "dashboard") as string;

  const parsedInput = InputSchema.safeParse(request.body);
  if (!parsedInput.success) return reply.status(400).send();
  const input = parsedInput.data;

  let to = new Date();
  let from = new Date(to);
  if (input.qtype === 'last') from.setDate(to.getDate() - input.last);
  if (input.qtype === 'between') {
    from = input.from;
    to = input.to;
  }

  const requestBody = JSON.stringify({ tenant: tenant.id, from, to });

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
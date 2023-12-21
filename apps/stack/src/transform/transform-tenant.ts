import { getTenants } from "@stack/config/tenants";
import { transformTenantEvent } from "./events";
import { z } from "zod";
import { ApiHandler, useJsonBody } from "sst/node/api";

const apiContextSchema = z.object({
  authorizer: z.object({
    jwt: z.object({
      claims: z.object({
        sub: z.string(),
      }),
    }),
  }),
});

const inputSchema = z.object({
  tenantId: z.number(),
});
export const apiHandler = ApiHandler(async (ev) => {
  const body = useJsonBody() as unknown;

  const lambdaContextValidation = apiContextSchema.safeParse(ev.requestContext);
  if (!lambdaContextValidation.success) {
    console.log("Error: Authorization failed - ", lambdaContextValidation.error.issues); // TODO: compliance check, might be insufficient_scope or something
    return {
      statusCode: 401,
      body: JSON.stringify({ message: "Unauthorized" }),
    }
  }

  const inputValidation = inputSchema.safeParse(body);

  if (!inputValidation.success) {
    console.log("Error: Input validation failed - ", inputValidation.error.issues);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: inputValidation.error.toString() }),
    }
  }

  const { tenantId } = inputValidation.data;

  try {
    await transformTenantEvent.publish({}, {
      version: 1,
      caller: 'transform-tenants:api',
      sourceControl: 'github',
      timestamp: Date.now(),
      from: new Date(0),
      to: new Date(),
      tenantId,
    });
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: (error as Error).toString() }),
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'started transform' })
  };
});

export const cronHandler = async () => {
  const tenants = getTenants();

  const utcTodayAt10AM = new Date();
  utcTodayAt10AM.setUTCHours(10, 0, 0, 0);
  const utcYesterdayAt10AM = new Date(utcTodayAt10AM);
  utcYesterdayAt10AM.setHours(utcTodayAt10AM.getUTCHours() - 24);

  console.log('publishing events: ',tenants.map(t=>t.tenant).join(", "));
  const publishingEvents = tenants.map(tenant=>transformTenantEvent.publish({},{
    version: 1,
    caller: 'transform-tenants:cron',
    sourceControl: 'github',
    timestamp: Date.now(),
    from: utcTodayAt10AM,
    to: utcTodayAt10AM,
    tenantId: tenant.id,
  }))

  let failed = 0;

  const publishingEventsSettled = await Promise.allSettled(publishingEvents);
  publishingEventsSettled.forEach((result,idx)=> {
    if (result.status === 'fulfilled') return;
    console.error(`Failed to publish event for tenant ${tenants[idx]?.id}:${tenants[idx]?.tenant}`);
    console.error(result.reason);
    failed++;
  });

  if (failed !== 0) throw new Error(`Cron failed to publish events. ${failed}/${tenants.length} events failed`);
}

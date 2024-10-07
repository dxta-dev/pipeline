import { z } from "zod";
import * as extract from "@dxta/extract-schema";
import { ApiHandler, useJsonBody } from "sst/node/api";
import { MessageKind, metadataSchema } from "./messages";
import { createMessageHandler } from "@stack/config/create-message";
import { timePeriodOf } from "@stack/config/time-period";
import { transformRepositoryEvent } from "./events";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { getTenants } from "@dxta/super-schema";
import { Config } from "sst/node/config";
import { initDatabase } from "./context";

export const tenantSenderHandler = createMessageHandler({
  queueId: 'TransformQueue',
  kind: MessageKind.Tenant,
  metadataShape: metadataSchema.omit({ sourceControl: true }).shape,
  contentShape: z.object({
    dbUrl: z.string(),
    tenantDomain: z.string(),
  }).shape,
  handler: async (message) => {

    const { from, to } = message.metadata;
    const { dbUrl } = message.content;
    const db = initDatabase(message.content);

    const tenantRepositories = await db.select({
      id: extract.repositories.id,
      externalId: extract.repositories.externalId,
      sourceControl: extract.repositories.forgeType
    }).from(extract.repositories).all();

    const promises: Promise<void>[] = [];
    for (const tenantRepository of tenantRepositories) {

      if (tenantRepository.sourceControl === 'gitlab') {
        console.log("Warn: Transform for gitlab repos is not yet implemented; external_id =", tenantRepository.externalId);
        continue;
      }

      promises.push(transformRepositoryEvent.publish({
        repositoryExtractId: tenantRepository.id,
      }, {
        version: 1,
        caller: 'transform-tenant:queueHandler',
        sourceControl: tenantRepository.sourceControl,
        timestamp: Date.now(),
        from,
        to,
        dbUrl,
      }))
    }

    await Promise.all(promises);

  }
});

const { sender } = tenantSenderHandler;

export const cronHandler = async () => {
  const superDb = drizzle(createClient({ url: Config.SUPER_DATABASE_URL, authToken: Config.SUPER_DATABASE_AUTH_TOKEN }));
  const tenants = await getTenants(superDb);
  const cronEnabledTenants = tenants.filter(x => x.crawlUserId !== '');
  const tenantTransformInput = cronEnabledTenants.map(tenant => ({ dbUrl: tenant.dbUrl, tenantDomain: tenant.name }));

  const PERIOD_DURATION = 15 * 60 * 1000; // 15 minutes
  const PERIOD_START_MARGIN = 5 * 60 * 1000; // 5 minutes
  const PERIOD_LATENCY = (15 - 8) * 60 * 1000; // extract delay
  const { from, to } = timePeriodOf(Date.now(), PERIOD_DURATION, PERIOD_START_MARGIN, PERIOD_LATENCY);

  await sender.sendAll(tenantTransformInput, {
    version: 1,
    caller: 'transform-tenants:cronHandler',
    timestamp: Date.now(),
    from,
    to,
    dbUrl: '', // required since create-event and create-message require this to be present in metadata, although this isnt a "crawl-function"
  });
}

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
  from: z.coerce.date(),
  to: z.coerce.date(),
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

  const { tenantId, from, to } = inputValidation.data;

  if (from.getTime() > to.getTime()) {
    return {
      statusCode: 400,
      body: JSON.stringify({error: `the lower bound of the period since: ${from.toISOString()} is greater than the upper bound until: ${to.toISOString()}`}),
    }
  }

  const superDb = drizzle(createClient({ url: Config.SUPER_DATABASE_URL, authToken: Config.SUPER_DATABASE_AUTH_TOKEN }));
  const tenants = await getTenants(superDb);
  const tenant = tenants.find(tenant => tenant.id === tenantId);

  if (!tenant) return {
    statusCode: 404,
    message: JSON.stringify({ error: "Tenant not found" })
  }

  try {
    await sender.send({
      dbUrl: tenant.dbUrl,
      tenantDomain: tenant.name,
    }, {
      version: 1,
      caller: 'transform-tenants:apiHandler',
      timestamp: Date.now(),
      from,
      to,
      dbUrl: '', // required since create-event and create-message require this to be present in metadata, although this isnt a "crawl-function"
    });
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: (error as Error).toString() }),
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: `Transforming tenant "${tenant.name}" in period (${from.toISOString()}...${to.toISOString()})` }),
  };
});

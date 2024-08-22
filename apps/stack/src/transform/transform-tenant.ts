import { z } from "zod";
import * as extract from "@dxta/extract-schema";
import { getTenants } from "@stack/config/tenants";
import { ApiHandler, useJsonBody } from "sst/node/api";
import { MessageKind, metadataSchema } from "./messages";
import { createMessageHandler } from "@stack/config/create-message";
import { getTenantDb } from "@stack/config/get-tenant-db";
import { timePeriodOf } from "@stack/config/time-period";
import { transformRepositoryEvent } from "./events";

export const tenantSenderHandler = createMessageHandler({
  queueId: 'TransformQueue',
  kind: MessageKind.Tenant,
  metadataShape: metadataSchema.omit({ sourceControl: true, tenantId: true }).shape,
  contentShape: z.object({
    tenantId: z.number(),
  }).shape,
  handler: async (message) => {

    const { from, to } = message.metadata;
    const { tenantId } = message.content;
    const db = getTenantDb(tenantId);

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
        tenantId,
      }))
    }

    await Promise.all(promises);

  }
});

const { sender } = tenantSenderHandler;

export const cronHandler = async () => {
  const tenants = getTenants().map(tenant => ({ tenantId: tenant.id }));

  const PERIOD_DURATION = 15 * 60 * 1000; // 15 minutes
  const PERIOD_START_MARGIN = 5 * 60 * 1000; // 5 minutes
  const PERIOD_LATENCY = (15 - 8) * 60 * 1000; // extract delay
  const { from, to } = timePeriodOf(Date.now(), PERIOD_DURATION, PERIOD_START_MARGIN, PERIOD_LATENCY);

  await sender.sendAll(tenants, {
    version: 1,
    caller: 'transform-tenants:cronHandler',
    timestamp: Date.now(),
    from,
    to,
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

  const tenants = getTenants();
  const tenant = tenants.find(tenant => tenant.id === tenantId);

  if (!tenant) return {
    statusCode: 404,
    message: JSON.stringify({ error: "Tenant not found" })
  }

  try {
    await sender.send({
      tenantId
    }, {
      version: 1,
      caller: 'transform-tenants:apiHandler',
      timestamp: Date.now(),
      from,
      to,
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

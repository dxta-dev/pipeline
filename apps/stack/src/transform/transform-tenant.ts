import { z } from "zod";
import * as extract from "@acme/extract-schema";
import { getTenants } from "@stack/config/tenants";
import { ApiHandler, useJsonBody } from "sst/node/api";
import { MessageKind, metadataSchema } from "./messages";
import { createMessageHandler } from "@stack/config/create-message";
import { getTenantDb } from "@stack/config/get-tenant-db";
import { and, eq, gt, lt } from "drizzle-orm";
import { timelineSenderHandler } from "./transform-timeline";

export const tenantSenderHandler = createMessageHandler({
  queueId: 'TransformQueue',
  kind: MessageKind.Tenant,
  metadataShape: metadataSchema.omit({ tenantId: true, sourceControl: true }).shape,
  contentShape: z.object({
    tenantId: z.number(),
  }).shape,
  handler: async (message)=> {

    const { from, to } = message.metadata;
    const { tenantId } = message.content;

    const db = getTenantDb(tenantId);
    const allMergeRequests = await db.select({
      mergeRequestId: extract.mergeRequests.id
    })
      .from(extract.mergeRequests)
      .leftJoin(extract.repositories, eq(extract.mergeRequests.repositoryId, extract.repositories.id))
      .where(and(
        eq(extract.repositories.forgeType, 'github'), // TODO: implement gitlab; Add forgeType to MRs ?
        gt(extract.mergeRequests.updatedAt, from),
        lt(extract.mergeRequests.updatedAt, to)
      ))
      .all();
      
      if (allMergeRequests.length === 0) {
        console.log("Warning: nothing to transform");
        return;
      }    
      
    console.log("Transforming", allMergeRequests.length, "merge requests");

    await timelineSenderHandler.sender.sendAll(allMergeRequests,{
      version: 1,
      caller: 'transform-tenant:queueHandler',
      sourceControl: 'github',
      timestamp: Date.now(),
      from,
      to,
      tenantId,
    });

  }
});

const { sender } = tenantSenderHandler;

export const cronHandler = async () => {
  const tenants = getTenants().map(tenant => ({ tenantId: tenant.id }));

  const utcTodayAt10AM = new Date();
  utcTodayAt10AM.setUTCHours(10, 0, 0, 0);
  const utcYesterdayAt10AM = new Date(utcTodayAt10AM);
  utcYesterdayAt10AM.setHours(utcTodayAt10AM.getUTCHours() - 24);

  await sender.sendAll(tenants, {
    version: 1,
    caller: 'transform-tenants:cronHandler',
    timestamp: Date.now(),
    from: utcYesterdayAt10AM,
    to: utcTodayAt10AM,
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
    await sender.send({
      tenantId
    }, {
      version: 1,
      caller: 'transform-tenants:apiHandler',
      timestamp: Date.now(),
      from: new Date(0),
      to: new Date(),
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

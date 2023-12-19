import { ApiHandler } from "sst/node/api";
import { z } from "zod";
import * as extract from "@acme/extract-schema";
import type { TransformDatabase, ExtractDatabase } from "@acme/transform-functions";
import { run } from "@acme/transform-functions";
import { createMessage } from "@stack/config/create-message";
import type { SQSEvent } from "aws-lambda";
import { and, gt, lt } from "drizzle-orm";
import { getTenantDb } from "@stack/config/get-tenant-db";
import { useJsonBody } from "sst/node/api";

const apiContextSchema = z.object({
  authorizer: z.object({
    jwt: z.object({
      claims: z.object({
        sub: z.string(),
      }),
    }),
  }),
});

const timelineMessageSchema = z.object({
  content: z.object({
    mergeRequestId: z.number(),
  }),
  metadata: z.object({
    tenantId: z.number(),
  }),
  kind: z.string()
});
const timelineMessage = createMessage({
  kind: 'transform-timeline',
  contentShape: timelineMessageSchema.shape.content.shape,
  metadataShape: timelineMessageSchema.shape.metadata.shape,
  queueId: 'TransformTestQueue',
});

type transformTimelineArgs = {
  from: Date;
  to: Date;
  tenantId: number;
}
const transformTimeline = async ({ from, to, tenantId }: transformTimelineArgs) => {
  const db = getTenantDb(tenantId);
  const allMergeRequests = await db.select({
    mergeRequestId: extract.mergeRequests.id
  })
    .from(extract.mergeRequests)
    .where(and(
      gt(extract.mergeRequests.updatedAt, from),
      lt(extract.mergeRequests.updatedAt, to)
    ))
    .all();

  console.log("Transforming", allMergeRequests.length, "merge requests");

  if (allMergeRequests.length === 0) {
    console.log("Warning: nothing to transform");
    return;
  }

  await timelineMessage.sendAll(allMergeRequests, { tenantId });

}

export const queueHandler = async (event: SQSEvent) => {
  if (event.Records.length > 1) console.warn('WARNING: QueueHandler should process 1 message but got', event.Records.length);
  for (const record of event.Records) {
    const messageValidationResult = timelineMessageSchema.safeParse(JSON.parse(record.body));
    if (!messageValidationResult.success) continue;
    
    const { content, metadata } = messageValidationResult.data;
    const db = getTenantDb(metadata.tenantId)

    await run(content.mergeRequestId, {
      extractDatabase: db as ExtractDatabase,
      transformDatabase: db as TransformDatabase,
    });
  }
}

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

  const input = inputValidation.data;

  try {
    await transformTimeline({
      from: new Date(0),
      to: new Date(),
      tenantId: input.tenantId,
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

const CRON_ENV = z.object({
  TENANT_ID: z.string(),
});
export const cronHandler = async () => {
  const validEnv = CRON_ENV.safeParse(process.env);

  if (!validEnv.success) {
    console.error("Invalid environment in lambda 'extract-repositories.cronHandler':", ...validEnv.error.issues);
    throw new Error("Invalid environment");
  }
  const { TENANT_ID } = validEnv.data;

  const utcTodayAt10AM = new Date();
  utcTodayAt10AM.setUTCHours(10, 0, 0, 0);
  const utcYesterdayAt10AM = new Date(utcTodayAt10AM);
  utcYesterdayAt10AM.setHours(utcTodayAt10AM.getUTCHours() - 24);

  await transformTimeline({
    from: utcTodayAt10AM,
    to: utcTodayAt10AM,
    tenantId: Number(TENANT_ID),
  });
}
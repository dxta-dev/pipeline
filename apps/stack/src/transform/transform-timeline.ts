import { ApiHandler } from "sst/node/api";
import { z } from "zod";
import * as extract from "@acme/extract-schema";
import * as transform from "@acme/transform-schema";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import type { Context, ExtractEntities, TransformEntities, TransformDatabase, ExtractDatabase } from "@acme/transform-functions";
import { run } from "@acme/transform-functions";
import { Config } from "sst/node/config";
import { createMessage } from "@stack/config/create-message";
import type { SQSEvent } from "aws-lambda";

const apiContextSchema = z.object({
  authorizer: z.object({
    jwt: z.object({
      claims: z.object({
        sub: z.string(),
      }),
    }),
  }),
});

const context = {
  extract: {
    db: drizzle(createClient({ url: Config.EXTRACT_DATABASE_URL, authToken: Config.EXTRACT_DATABASE_AUTH_TOKEN })),
    entities: {
      mergeRequests: extract.mergeRequests,
    }
  },
  transform: {
    db: drizzle(createClient({ url: Config.TRANSFORM_DATABASE_URL, authToken: Config.TRANSFORM_DATABASE_AUTH_TOKEN })),
    entities: {
      dates: transform.dates,
    }
  }
} satisfies Context<Partial<ExtractEntities>, Partial<TransformEntities>>;

const timelineMessageSchema = z.object({ 
  content: z.object({
    mergeRequestId: z.number(),
  }),
  metadata: z.object({}),
  kind: z.string()
 });
const timelineMessage = createMessage({
  kind: 'transform-timeline',
  contentShape: timelineMessageSchema.shape.content.shape,
  metadataShape: timelineMessageSchema.shape.metadata.shape,
  queueId: 'TransformTestQueue',
});

export const apiHandler = ApiHandler(async (ev) => {

  const lambdaContextValidation = apiContextSchema.safeParse(ev.requestContext);
  if (!lambdaContextValidation.success) return {
    statusCode: 401,
    body: JSON.stringify(lambdaContextValidation.error),
  }

  const allMergeRequests = await context.extract.db.select({
    mergeRequestId: context.extract.entities.mergeRequests.id
  })
    .from(context.extract.entities.mergeRequests)
    .all();

  if (allMergeRequests.length === 0) return {
    statusCode: 412,
    body: JSON.stringify({ error: new Error("No extracted merge request found").toString() }),
  }

  await timelineMessage.sendAll(allMergeRequests, {});

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'started transform' })
  };
});

export const queueHandler = async (event:SQSEvent) => {
  if (event.Records.length > 1) console.warn('WARNING: QueueHandler should process 1 message but got', event.Records.length);
  for (const record of event.Records) {
    const messageValidationResult = timelineMessageSchema.safeParse(JSON.parse(record.body));
    if (!messageValidationResult.success) continue;

    const messageContent = messageValidationResult.data.content;

    await run(messageContent.mergeRequestId, {
      extractDatabase: context.extract.db as ExtractDatabase,
      transformDatabase: context.transform.db as TransformDatabase,
    });
  }
}
import { z } from "zod";
import * as extract from "@acme/extract-schema";
import type { TransformDatabase, ExtractDatabase } from "@acme/transform-functions";
import { run } from "@acme/transform-functions";
import { createMessage, createMessageHandler } from "@stack/config/create-message";
import type { SQSEvent } from "aws-lambda";
import { and, gt, lt } from "drizzle-orm";
import { getTenantDb } from "@stack/config/get-tenant-db";
import { EventHandler } from "@stack/config/create-event";
import { transformTenantEvent } from "./events";
import { MessageKind, metadataSchema } from "./messages";

export const eventHandler = EventHandler(transformTenantEvent, async (ev) => {
  const { from, to, tenantId } = ev.metadata;

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

  await sender.sendAll(allMergeRequests, { 
    version: 1,
    caller: 'transform-timeline',
    sourceControl: ev.metadata.sourceControl,
    timestamp: Date.now(),
    from,
    to,
    tenantId,
  });
});

export const timelineSenderHandler = createMessageHandler({
  queueId: 'TransformQueue',
  kind: MessageKind.Timeline,
  metadataShape: metadataSchema.shape,
  contentShape: z.object({
    mergeRequestId: z.number(),
  }).shape,
  handler: async (message) => {
    const db = getTenantDb(message.metadata.tenantId);

    await run(message.content.mergeRequestId, {
      extractDatabase: db as ExtractDatabase,
      transformDatabase: db as TransformDatabase,
    });
  }
})

const { sender } = timelineSenderHandler;

// const timelineMessageSchema = z.object({
//   content: z.object({
//     mergeRequestId: z.number(),
//   }),
//   metadata: z.object({
//     tenantId: z.number(),
//   }),
//   kind: z.string()
// });
// const timelineMessage = createMessage({
//   kind: 'transform-timeline',
//   contentShape: timelineMessageSchema.shape.content.shape,
//   metadataShape: timelineMessageSchema.shape.metadata.shape,
//   queueId: 'TransformTestQueue',
// });
// export const queueHandler = async (event: SQSEvent) => {
//   if (event.Records.length > 1) console.warn('WARNING: QueueHandler should process 1 message but got', event.Records.length);
//   for (const record of event.Records) {
//     const messageValidationResult = timelineMessageSchema.safeParse(JSON.parse(record.body));
//     if (!messageValidationResult.success) continue;
    
//     const { content, metadata } = messageValidationResult.data;
//     const db = getTenantDb(metadata.tenantId)

//     await run(content.mergeRequestId, {
  // extractDatabase: db as ExtractDatabase,
  // transformDatabase: db as TransformDatabase,
//     });
//   }
// }




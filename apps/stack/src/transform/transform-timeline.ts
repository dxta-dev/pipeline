import { z } from "zod";
import * as extract from "@acme/extract-schema";
import type { TransformDatabase, ExtractDatabase } from "@acme/transform-functions";
import { run } from "@acme/transform-functions";
import { createMessageHandler } from "@stack/config/create-message";
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

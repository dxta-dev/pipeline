import { z } from "zod";
import type { TransformDatabase, ExtractDatabase, TenantDatabase } from "@dxta/transform-functions";
import * as extract from "@dxta/extract-schema";
import { run } from "@dxta/transform-functions";
import { createMessageHandler } from "@stack/config/create-message";
import { getTenantDb } from "@stack/config/get-tenant-db";
import { MessageKind, metadataSchema } from "./messages";
import { EventHandler } from "@stack/config/create-event";
import { transformRepositoryEvent } from "./events";
import { and, eq, gt, lt } from "drizzle-orm";

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
      tenantDatabase: db as TenantDatabase,
    });
  }
});

const { sender } = timelineSenderHandler;

export const eventHandler = EventHandler(transformRepositoryEvent, async (ev) => {

  const { repositoryExtractId } = ev.properties;
  const { tenantId, from, to, sourceControl } = ev.metadata;
  const db = getTenantDb(tenantId);

  const allMergeRequests = await db.select({
    mergeRequestId: extract.mergeRequests.id
  })
    .from(extract.mergeRequests)
    .where(and(
      eq(extract.mergeRequests.repositoryId, repositoryExtractId),
      gt(extract.mergeRequests.updatedAt, from),
      lt(extract.mergeRequests.updatedAt, to)
    ))
    .all();

  if (allMergeRequests.length === 0) return;

  await sender.sendAll(allMergeRequests, {
    version: 1,
    caller: 'transform-timeline',
    timestamp: Date.now(),
    sourceControl,
    from,
    to,
    tenantId,
  })

});
import { z } from "zod";
import type { TransformDatabase, ExtractDatabase, TenantDatabase } from "@dxta/transform-functions";
import { run, selectMergeRequestsDeployments } from "@dxta/transform-functions";
import { createMessageHandler } from "@stack/config/create-message";
import { getTenantDb } from "@stack/config/get-tenant-db";
import { MessageKind, metadataSchema } from "./messages";
import { EventHandler } from "@stack/config/create-event";
import { transformRepositoryEvent } from "./events";

export const timelineSenderHandler = createMessageHandler({
  queueId: 'TransformQueue',
  kind: MessageKind.Timeline,
  metadataShape: metadataSchema.shape,
  contentShape: z.object({
    mergeRequestId: z.number(),
    deploymentId: z.nullable(z.number()),
  }).shape,
  handler: async (message) => {
    const db = getTenantDb(message.metadata.tenantId);

    await run(message.content.mergeRequestId, message.content.deploymentId, {
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

  const mrDeploys = await selectMergeRequestsDeployments(db, repositoryExtractId, from, to);

  if (mrDeploys.length === 0) return;

  await sender.sendAll(mrDeploys, {
    version: 1,
    caller: 'transform-timeline',
    timestamp: Date.now(),
    sourceControl,
    from,
    to,
    tenantId,
  })

});
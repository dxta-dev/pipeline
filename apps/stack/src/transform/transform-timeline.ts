import { z } from "zod";
import type {
  TransformDatabase,
  ExtractDatabase,
  TenantDatabase,
} from "@dxta/transform-functions";
import { run, selectMergeRequestsDeployments } from "@dxta/transform-functions";
import { createMessageHandler } from "@stack/config/create-message";
import { MessageKind, metadataSchema } from "./messages";
import { EventHandler } from "@stack/config/create-event";
import { transformRepositoryEvent } from "./events";
import { initDatabase } from "./context";

export const timelineSenderHandler = createMessageHandler({
  queueId: "TransformQueue",
  kind: MessageKind.Timeline,
  metadataShape: metadataSchema.shape,
  contentShape: z.object({
    mergeRequestId: z.number(),
    deploymentId: z.nullable(z.number()),
  }).shape,
  handler: async (message) => {
    const db = initDatabase(message.metadata);

    await run(message.content.mergeRequestId, message.content.deploymentId, {
      extractDatabase: db as ExtractDatabase,
      transformDatabase: db as TransformDatabase,
      tenantDatabase: db as TenantDatabase,
    });
  },
});

const { sender } = timelineSenderHandler;

export const eventHandler = EventHandler(
  transformRepositoryEvent,
  async (ev) => {
    const { repositoryExtractId } = ev.properties;
    const { dbUrl, from, to, sourceControl } = ev.metadata;
    const db = initDatabase(ev.metadata);

    const mrDeploys = await selectMergeRequestsDeployments(
      db,
      repositoryExtractId,
      from,
      to,
    );

    if (mrDeploys.length === 0) return;

    await sender.sendAll(mrDeploys, {
      version: 1,
      caller: "transform-timeline",
      timestamp: Date.now(),
      sourceControl,
      from,
      to,
      dbUrl,
    });
  },
);

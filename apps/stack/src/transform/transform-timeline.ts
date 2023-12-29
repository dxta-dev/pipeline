import { z } from "zod";
import type { TransformDatabase, ExtractDatabase } from "@acme/transform-functions";
import { run } from "@acme/transform-functions";
import { createMessageHandler } from "@stack/config/create-message";
import { getTenantDb } from "@stack/config/get-tenant-db";
import { MessageKind, metadataSchema } from "./messages";

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

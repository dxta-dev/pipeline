import { EventBus } from "sst/node/event-bus";
import { z } from "zod";
import { RepositorySchema } from "@acme/extract-schema";
import { NamespaceSchema } from "@acme/extract-schema/src/namespaces";
import { createEvent } from "./create-event";

const extractRepositoryEventSchema = z.object({
  repository: RepositorySchema,
  namespace: z.nullable(NamespaceSchema),
});

const metadataSchema = z.object({
  version: z.number(),
  timestamp: z.number(),
  caller: z.string(),
  sourceControl: z.literal("github").or(z.literal("gitlab")),
  userId: z.string(),
});

export const extractRepositoryEvent = createEvent({
  source: "extract",
  type: "repository",
  propertiesShape: extractRepositoryEventSchema.shape,
  eventBusName: EventBus.ExtractBus.eventBusName,
  metadataShape: metadataSchema.shape,
});

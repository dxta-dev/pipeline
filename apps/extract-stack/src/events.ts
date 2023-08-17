import { EventBus } from "sst/node/event-bus";
import { z } from "zod";

import { MergeRequestSchema } from "@acme/extract-schema/src/merge-requests";
import { createEvent } from "./create-event";

const extractRepositoryEventSchema = z.object({
  repositoryId: z.number(),
  namespaceId: z.nullable(z.number()),
});

const metadataSchema = z.object({
  version: z.number(),
  timestamp: z.number(),
  caller: z.string(),
  sourceControl: z.literal("github").or(z.literal("gitlab")),
  userId: z.string(),
});
const extractMergeRequestEventSchema = z.object({
  mergeRequests: z.array(MergeRequestSchema),
});

export const extractMergeRequestsEvent = {
  schemaShape: extractMergeRequestEventSchema.shape,
  source: "extract",
  detailType: "mergeRequest",
};

export const extractRepositoryEvent = createEvent({
  source: "extract",
  type: "repository",
  propertiesShape: extractRepositoryEventSchema.shape,
  eventBusName: EventBus.ExtractBus.eventBusName,
  metadataShape: metadataSchema.shape,
});

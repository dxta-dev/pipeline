import { createEventBuilder } from "sst/node/event-bus";
import { z } from "zod";

export const eventBuilder = createEventBuilder({
  // wtf?
  bus: "extract-bus" as never,
  metadata: z.object({
    version: z.number(),
    timestamp: z.number(),
    caller: z.string(),
  }).shape,
});

export const extractRepositoryEvent = {
  schema: z.object({
    repository: z.string(),
  }),
  source: 'extract',
  detailType: 'repository',
};

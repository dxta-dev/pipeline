import { createEventBuilder } from "sst/node/event-bus";
import { z } from "zod";

const extractBusEventBuilder = createEventBuilder({
  bus: "ExtractBus",
  metadata: z.object({
    version: z.number(),
    timestamp: z.number(),
    caller: z.string(),
    sourceControl: z.literal("github").or(z.literal("gitlab")),
    userId: z.string(),
  }).shape,
});

export const buildExtractBusEvent = <EventSchemaShape extends z.ZodRawShape>(type: string, properties: EventSchemaShape) =>
  extractBusEventBuilder(`extract.${type}`, properties);
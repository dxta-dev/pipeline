import { createEventBuilder } from "sst/node/event-bus";
import { z } from "zod";
import { RepositorySchema } from "@acme/extract-schema";

const eventBuilder = createEventBuilder({
  // wtf?
  bus: "extract-bus" as never,
  metadata: z.object({
    version: z.number(),
    timestamp: z.number(),
    caller: z.string(),
  }).shape,
});

export const extractRepositoryEvent = {
  schemaShape: RepositorySchema.shape,
  source: 'extract',
  detailType: 'repository',
};

export function defineEvent<EventSchemaShape extends z.ZodRawShape>(p: {
  source: string;
  detailType: string;
  schemaShape: EventSchemaShape;
}) {
  return eventBuilder(`${p.source}.${p.detailType}`, p.schemaShape);
}

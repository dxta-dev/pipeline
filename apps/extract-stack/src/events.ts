import { createEventBuilder } from "sst/node/event-bus";
import { z } from "zod";
import { RepositorySchema } from "@acme/extract-schema";
import { NamespaceSchema } from "@acme/extract-schema/src/namespaces";

const eventBuilder = createEventBuilder({
  bus: "ExtractBus",
  metadata: z.object({
    version: z.number(),
    timestamp: z.number(),
    caller: z.string(),
    sourceControl: z.literal("github").or(z.literal("gitlab")),
    userId: z.string(),
  }).shape,
});

const extractRepositoryEventSchema = z.object({
  repository: RepositorySchema,
  namespace: z.nullable(NamespaceSchema),
});

export const extractRepositoryEvent = {
  schemaShape: extractRepositoryEventSchema.shape,
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

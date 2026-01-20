import { RepositorySchema } from "@dxta/extract-schema";
import { createEvent } from "@stack/config/create-event";
import { z } from "zod";

export const metadataSchema = z.object({
  version: z.number(),
  timestamp: z.number(),
  caller: z.string(),
  sourceControl: z.literal("github"), // TODO: implement gitlab transform // .or(z.literal("gitlab")),
  from: z.coerce.date(),
  to: z.coerce.date(),
  dbUrl: z.string(),
});

const transformRepositoryEventSchema = z.object({
  repositoryExtractId: RepositorySchema.shape.id,
});

export type transformRepositoryEventMessage = z.infer<
  typeof transformRepositoryEventSchema
>;

export const transformRepositoryEvent = createEvent({
  bus: "TransformBus",
  source: "transform",
  type: "repository",
  propertiesShape: transformRepositoryEventSchema.shape,
  metadataShape: metadataSchema.shape,
});

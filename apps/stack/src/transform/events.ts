import { createEvent } from "@stack/config/create-event";
import { z } from "zod";

export const metadataSchema = z.object({
  version: z.number(),
  timestamp: z.number(),
  caller: z.string(),
  sourceControl: z.literal("github"), // TODO: implement gitlab transform // .or(z.literal("gitlab")),
  from: z.coerce.date(),
  to: z.coerce.date(),
  tenantId: z.number(),
});

export const transformTenantEventSchema = z.object({});

export const transformTenantEvent = createEvent({
  source: "transform",
  type: "tenant",
  propertiesShape: transformTenantEventSchema.shape,
  bus: 'TransformBus',
  metadataShape: metadataSchema.shape,
});

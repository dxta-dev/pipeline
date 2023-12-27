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

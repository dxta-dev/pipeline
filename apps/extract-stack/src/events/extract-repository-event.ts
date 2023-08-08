import { RepositorySchema } from "@acme/extract-schema";
import { NamespaceSchema } from "@acme/extract-schema/src/namespaces";
import z from "zod";
import { buildExtractBusEvent } from "./extract-bus";

export const ExtractRepositoryEvent = buildExtractBusEvent('repository', {
  repository: RepositorySchema,
  namespace: z.nullable(NamespaceSchema)
})
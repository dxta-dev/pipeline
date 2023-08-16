import { z } from "zod";
import { RepositorySchema } from "@acme/extract-schema";
import { NamespaceSchema } from "@acme/extract-schema/src/namespaces";
import { createMessage } from "./create-message";
import { Queue } from 'sst/node/queue'

const paginationSchema = z.object({
  page: z.number(),
  perPage: z.number(),
  totalPages: z.number(),
});

const extractRepositoryDataSchema = z.object({
  repository: RepositorySchema,
  namespace: z.nullable(NamespaceSchema),
  pagination: paginationSchema
});

const metadataSchema = z.object({
  version: z.number(),
  timestamp: z.number(),
  caller: z.string(),
  sourceControl: z.literal("github").or(z.literal("gitlab")),
  userId: z.string(),
});

export const extractMemberPageMessage = createMessage({
  metadataShape: metadataSchema.shape,
  contentShape: extractRepositoryDataSchema.shape,
  queueUrl: Queue.ExtractMemberPageQueue.queueUrl
});

export const extractMergeRequestMessage = createMessage({
  metadataShape: metadataSchema.shape,
  contentShape: extractRepositoryDataSchema.shape,
  queueUrl: Queue.MRQueue.queueUrl
});
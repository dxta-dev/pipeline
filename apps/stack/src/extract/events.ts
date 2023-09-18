import { z } from "zod";

import { createEvent } from "@stack/config/create-event";
import { MergeRequestSchema } from "@acme/extract-schema/src/merge-requests";
import { MemberSchema, NamespaceSchema, RepositorySchema } from "@acme/extract-schema";

const extractRepositoryEventSchema = z.object({
  repositoryId: z.number(),
  namespaceId: z.number(),
});

const metadataSchema = z.object({
  version: z.number(),
  timestamp: z.number(),
  caller: z.string(),
  sourceControl: z.literal("github").or(z.literal("gitlab")),
  userId: z.string(),
});

const extractMergeRequestEventSchema = z.object({
  mergeRequestIds: z.array(MergeRequestSchema.shape.id),
  repositoryId: RepositorySchema.shape.id,
  namespaceId: NamespaceSchema.shape.id
});

export type extractMergeRequestsEventMessage = z.infer<typeof extractMergeRequestEventSchema>;

export const extractMergeRequestsEvent = createEvent({
  source: "extract",
  type: "mergeRequest",
  propertiesShape: extractMergeRequestEventSchema.shape,
  bus: 'ExtractBus',
  metadataShape: metadataSchema.shape,
});

export const extractRepositoryEvent = createEvent({
  source: "extract",
  type: "repository",
  propertiesShape: extractRepositoryEventSchema.shape,
  bus: 'ExtractBus',
  metadataShape: metadataSchema.shape,
});

export const extractMembersEvent = createEvent({
  source: "extract",
  type: "members",
  propertiesShape: z.object({
    memberIds: z.array(MemberSchema.shape.id),
  }).shape,
  bus: 'ExtractBus',
  metadataShape: metadataSchema.shape,
});

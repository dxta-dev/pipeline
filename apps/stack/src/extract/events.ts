import { z } from "zod";

import { createEvent } from "@stack/config/create-event";
import { MergeRequestSchema } from "@dxta/extract-schema/src/merge-requests";
import { DeploymentSchema, MemberSchema, NamespaceSchema, RepositorySchema } from "@dxta/extract-schema";

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
  from: z.coerce.date(),
  to: z.coerce.date(),
  crawlId: z.number(),
  dbUrl: z.string(),
});

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
export const isInitialExtractEvent = ({ metadata }: { metadata: z.infer<typeof metadataSchema> }) => {
  return (metadata.to.getTime() - metadata.from.getTime()) > FOURTEEN_DAYS_MS;
}

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

export const extractMemberInfoEvent = createEvent({
  bus: "ExtractBus",
  source: "extract",
  type: "memberInfo",
  propertiesShape: {
    memberId: MemberSchema.shape.id,
  },
  metadataShape: metadataSchema.shape
})

const extractDeploymentsEventSchema = z.object({
  deploymentIds: z.array(DeploymentSchema.shape.id),
  repositoryId: RepositorySchema.shape.id,
  namespaceId: NamespaceSchema.shape.id
});

export type extractDeploymentsEventMessage = z.infer<typeof extractMergeRequestEventSchema>;

export const extractDeploymentsEvent = createEvent({
  source: "extract",
  type: "deployment",
  propertiesShape: extractDeploymentsEventSchema.shape,
  bus: 'ExtractBus',
  metadataShape: metadataSchema.shape,
});


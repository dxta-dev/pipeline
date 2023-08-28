import { z } from "zod";
import { RepositorySchema } from "@acme/extract-schema";
import { NamespaceSchema } from "@acme/extract-schema/src/namespaces";
import { createMessage } from "./create-message";
import { Queue } from 'sst/node/queue'
import { MergeRequestSchema } from "@acme/extract-schema/src/merge-requests";

const messageTypeSchema = z.literal("member").or(z.literal("merge-request")).or(z.literal("merge-request-diff")).or(z.literal("merge-request-commit"));

export type messageType = z.infer<typeof messageTypeSchema>;

const paginationSchema = z.object({
  page: z.number(),
  perPage: z.number(),
  totalPages: z.number(),
});

const extractRepositoryDataSchema = z.object({
  repository: RepositorySchema,
  namespace: NamespaceSchema,
  pagination: paginationSchema
});

const extractMergeRequestDataSchema = z.object({
  mergeRequestIds: z.array(MergeRequestSchema.shape.id),
  repositoryId: RepositorySchema.shape.id,
  namespaceId: NamespaceSchema.shape.id,
})

export type extractRepositoryData = z.infer<typeof extractRepositoryDataSchema>;
export type extractMergeRequestData = z.infer<typeof extractMergeRequestDataSchema>;

const metadataSchema = z.object({
  version: z.number(),
  timestamp: z.number(),
  caller: z.string(),
  sourceControl: z.literal("github").or(z.literal("gitlab")),
  userId: z.string(),
});

enum MessageKind {
  Member = "member",
  MergeRequest = "merge-request",
  MergeRequestDiff = "merge-request-diff",
  MergeRequestCommit = "merge-request-commit",
};


export const extractMemberPageMessage = createMessage({
  kind: MessageKind.Member,
  metadataShape: metadataSchema.shape,
  contentShape: extractRepositoryDataSchema.shape,
});

export const extractMergeRequestMessage = createMessage({
  kind: MessageKind.MergeRequest,
  metadataShape: metadataSchema.shape,
  contentShape: extractRepositoryDataSchema.shape,
});

export const extractMergeRequestDiffMessage = createMessage({
  kind: MessageKind.MergeRequestDiff,
  metadataShape: metadataSchema.shape,
  contentShape: extractMergeRequestDataSchema.shape,
});

export const extractMergeRequestCommitMessage = createMessage({
  kind: MessageKind.MergeRequestCommit,
  metadataShape: metadataSchema.shape,
  contentShape: extractMergeRequestDataSchema.shape,
});

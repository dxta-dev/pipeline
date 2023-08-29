import { z } from "zod";
import { QueueHandler } from "./create-message";
import { memberSenderHandler } from "./extract-members";
import { mergeRequestCommitSenderHandler } from "./extract-merge-request-commits";
import { mergeRequestDiffSenderHandler } from "./extract-merge-request-diffs";

export const paginationSchema = z.object({
  page: z.number(),
  perPage: z.number(),
  totalPages: z.number(),
});

export const metadataSchema = z.object({
  version: z.number(),
  timestamp: z.number(),
  caller: z.string(),
  sourceControl: z.literal("github").or(z.literal("gitlab")),
  userId: z.string(),
});

export enum MessageKind {
  Member = "member",
  MergeRequest = "merge-request",
  MergeRequestDiff = "merge-request-diff",
  MergeRequestCommit = "merge-request-commit",
};

const messageHandlers = new Map<string, unknown>();

messageHandlers.set(MessageKind.MergeRequest, mergeRequestDiffSenderHandler);

messageHandlers.set(MessageKind.MergeRequestDiff, mergeRequestDiffSenderHandler);

messageHandlers.set(MessageKind.MergeRequestCommit, mergeRequestCommitSenderHandler);

messageHandlers.set(MessageKind.Member, memberSenderHandler);

export const handleMessage = QueueHandler(messageHandlers);

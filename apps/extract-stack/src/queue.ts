import { QueueHandler } from "./create-message";
import { memberSenderHandler } from "./extract-members";
import { mergeRequestDiffSenderHandler } from "./extract-merge-request-diffs";
import { mrcsh } from "./extract-merge-request-commits";
import { mergeRequestSenderHandler } from "./extract-merge-requests";
import { MessageKind } from "./messages";

const messageHandlers = new Map<string, unknown>();

messageHandlers.set(MessageKind.MergeRequest, mergeRequestSenderHandler);

messageHandlers.set(MessageKind.MergeRequestDiff, mergeRequestDiffSenderHandler);

messageHandlers.set(MessageKind.MergeRequestCommit, mrcsh);

messageHandlers.set(MessageKind.Member, memberSenderHandler);

export const handler = QueueHandler(messageHandlers);

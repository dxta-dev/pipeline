import { QueueHandler } from "./create-message";
import { memberSenderHandler } from "./extract-members";
import { mergeRequestDiffSenderHandler } from "./extract-merge-request-diffs";
import { mrcsh } from "./extract-merge-request-commits";
import { mergeRequestSenderHandler } from "./extract-merge-requests";
import { MessageKind } from "./messages";

const messageHandlers = new Map<string, unknown>();

messageHandlers.set(MessageKind.MergeRequest, mergeRequestSenderHandler, ['repository.id', 'namespace.id', 'pagination']);

messageHandlers.set(MessageKind.MergeRequestDiff, mergeRequestDiffSenderHandler, []);

messageHandlers.set(MessageKind.MergeRequestCommit, mrcsh, []);

messageHandlers.set(MessageKind.Member, memberSenderHandler, []);

const logMap = new Map<string, string[]>();

logMap.set(MessageKind.MergeRequest, ['repository.id', 'namespace.id', 'pagination']);


export const handler = QueueHandler(messageHandlers);



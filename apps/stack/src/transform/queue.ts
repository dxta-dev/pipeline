import { QueueHandler } from "@stack/config/create-message";
import { MessageKind } from "./messages";
import { timelineSenderHandler } from "./transform-timeline";
import type { EventNamespaceType } from "@acme/crawl-schema"; // shouldn't use this
import { tenantSenderHandler } from "./transform-tenant";

const messageHandlers = new Map<string, unknown>();

messageHandlers.set(MessageKind.Tenant, tenantSenderHandler);
messageHandlers.set(MessageKind.Timeline, timelineSenderHandler);

const logMap = new Map<string, string[]>();

logMap.set(MessageKind.Tenant, ['content.tenantId']);
logMap.set(MessageKind.Timeline, ['metadata.tenantId', 'content.mergeRequestId']);

const crawlNamespaceMap = new Map<string, EventNamespaceType>();

export const handler = QueueHandler(messageHandlers, logMap, crawlNamespaceMap);


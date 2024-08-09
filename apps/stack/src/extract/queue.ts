import { QueueHandler } from "@stack/config/create-message";
import { MessageKind } from "./messages";
import type { EventNamespaceType } from "@dxta/crawl-schema";
import { tenantSenderHandler } from "./extract-tenants";
import { repositorySenderHandler } from "./extract-repository";
import { mergeRequestSenderHandler } from "./extract-merge-requests";
import { mergeRequestDiffSenderHandler } from "./extract-merge-request-diffs";
import { mrcsh } from "./extract-merge-request-commits";
import { memberInfoSenderHandler } from "./extract-member-info";
import { mergeRequestNoteSenderHandler } from "./extract-merge-request-notes";
import { memberSenderHandler } from "./extract-members";
import { namespaceMemberSenderHandler } from "./extract-namespace-members";
import { timelineEventsSenderHandler } from "./extract-timeline-events";
import { workflowsSenderHandler } from "./extract-cicd-workflows";
import { runsSenderHandler } from "./extract-cicd-runs";
import { commitsSenderHandler } from "./extract-default-branch-commits";

const messageHandlers = new Map<string, unknown>();

messageHandlers.set(MessageKind.Tenant, tenantSenderHandler);

messageHandlers.set(MessageKind.Repository, repositorySenderHandler);

messageHandlers.set(MessageKind.MergeRequest, mergeRequestSenderHandler);

messageHandlers.set(MessageKind.MergeRequestDiff, mergeRequestDiffSenderHandler);

messageHandlers.set(MessageKind.MergeRequestCommit, mrcsh);

messageHandlers.set(MessageKind.MergeRequestNote, mergeRequestNoteSenderHandler);

messageHandlers.set(MessageKind.Member, memberSenderHandler);

messageHandlers.set(MessageKind.NamespaceMember, namespaceMemberSenderHandler);

messageHandlers.set(MessageKind.MemberInfo, memberInfoSenderHandler);

messageHandlers.set(MessageKind.TimelineEvent, timelineEventsSenderHandler);

messageHandlers.set(MessageKind.Workflow, workflowsSenderHandler);

messageHandlers.set(MessageKind.CicdRuns, runsSenderHandler);

messageHandlers.set(MessageKind.DefaultBranchCommit, commitsSenderHandler);

const logMap = new Map<string, string[]>();

logMap.set(MessageKind.Tenant, ['content.tenantId']);

logMap.set(MessageKind.Repository, ['content.forgeType', 'content.externalRepositoryId', 'content.repositoryName']);

logMap.set(MessageKind.MergeRequest, ['content.repository.id', 'content.namespace.id', 'content.pagination', 'metadata.from', 'metadata.to']);

logMap.set(MessageKind.MergeRequestDiff, ['content.repositoryId', 'content.namespaceId', 'content.mergeRequestId']);

logMap.set(MessageKind.MergeRequestCommit, ['content.repositoryId', 'content.namespaceId', 'content.mergeRequestId']);

logMap.set(MessageKind.MergeRequestNote, ['content.repositoryId', 'content.namespaceId', 'content.mergeRequestId']);

logMap.set(MessageKind.Member, ['content.repository.id', 'content.namespace.id']);

logMap.set(MessageKind.NamespaceMember, ['content.repositoryId', 'content.namespace.id']);

logMap.set(MessageKind.MemberInfo, ['content.memberId']);

logMap.set(MessageKind.TimelineEvent, ['content.repositoryId', 'content.namespaceId', 'content.mergeRequestId']);

logMap.set(MessageKind.Workflow, ['content.repository.id', 'content.namespace.id', 'content.pagination']);

logMap.set(MessageKind.CicdRuns, ['content.repository.id', 'content.namespace.id', 'content.workflowId', 'content.page'])

logMap.set(MessageKind.DefaultBranchCommit, ['content.repository.id', 'content.namespace.id', 'content.page'])

const crawlNamespaceMap = new Map<string, EventNamespaceType>();

crawlNamespaceMap.set(MessageKind.MergeRequest, "mergeRequest");

crawlNamespaceMap.set(MessageKind.MergeRequestDiff, "mergeRequestDiff");

crawlNamespaceMap.set(MessageKind.MergeRequestCommit, "mergeRequestCommit");

crawlNamespaceMap.set(MessageKind.MergeRequestNote, "mergeRequestNote");

crawlNamespaceMap.set(MessageKind.Member, "member");

crawlNamespaceMap.set(MessageKind.NamespaceMember, "member");

crawlNamespaceMap.set(MessageKind.MemberInfo, "memberInfo");

crawlNamespaceMap.set(MessageKind.Workflow, "workflow");

crawlNamespaceMap.set(MessageKind.MergeRequestCommit, "defaultBranchCommit");

export const handler = QueueHandler(messageHandlers, logMap, crawlNamespaceMap);

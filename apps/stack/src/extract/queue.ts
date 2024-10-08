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
import { workflowDeploymentsSenderHandler } from "./extract-workflow-deployments";
import { commitsSenderHandler } from "./extract-default-branch-commits";
import { deploymentsSenderHandler } from "./extract-deployments";
import { deploymentStatusSenderHandler } from "./extract-deployment-status";
import { workflowDeploymentStatusSenderHandler } from "./extract-workflow-deployment-status";

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

messageHandlers.set(MessageKind.WorkflowDeployments, workflowDeploymentsSenderHandler);

messageHandlers.set(MessageKind.DefaultBranchCommit, commitsSenderHandler);

messageHandlers.set(MessageKind.Deployment, deploymentsSenderHandler);

messageHandlers.set(MessageKind.DeploymentStatus, deploymentStatusSenderHandler);

messageHandlers.set(MessageKind.WorkflowDeploymentStatus, workflowDeploymentStatusSenderHandler);

const logMap = new Map<string, string[]>();

logMap.set(MessageKind.Tenant, ['content.tenantDomain']);

logMap.set(MessageKind.Repository, ['content.forgeType', 'content.externalRepositoryId', 'content.repositoryName']);

logMap.set(MessageKind.MergeRequest, ['content.repository.id', 'content.namespace.id', 'content.pagination', 'metadata.from', 'metadata.to']);

logMap.set(MessageKind.MergeRequestDiff, ['content.repositoryId', 'content.namespaceId', 'content.mergeRequestId']);

logMap.set(MessageKind.MergeRequestCommit, ['content.repositoryId', 'content.namespaceId', 'content.mergeRequestId']);

logMap.set(MessageKind.MergeRequestNote, ['content.repositoryId', 'content.namespaceId', 'content.mergeRequestId']);

logMap.set(MessageKind.Member, ['content.repository.id', 'content.namespace.id']);

logMap.set(MessageKind.NamespaceMember, ['content.repositoryId', 'content.namespace.id']);

logMap.set(MessageKind.MemberInfo, ['content.memberId']);

logMap.set(MessageKind.TimelineEvent, ['content.repositoryId', 'content.namespaceId', 'content.mergeRequestId']);

logMap.set(MessageKind.WorkflowDeployments, ['content.repository.id', 'content.namespace.id', 'content.workflowId', 'content.page'])

logMap.set(MessageKind.DefaultBranchCommit, ['content.repository.id', 'content.namespace.id', 'content.page'])

logMap.set(MessageKind.Deployment, ['content.repository.id', 'content.namespace.id', 'content.environment', 'content.page'])

logMap.set(MessageKind.DeploymentStatus, ['content.repository.id', 'content.namespace.id', 'content.deployment.id'])

logMap.set(MessageKind.WorkflowDeploymentStatus, ['content.repository.id', 'content.namespace.id', 'content.deployment.id'])

const crawlNamespaceMap = new Map<string, EventNamespaceType>();

crawlNamespaceMap.set(MessageKind.MergeRequest, "mergeRequest");

crawlNamespaceMap.set(MessageKind.MergeRequestDiff, "mergeRequestDiff");

crawlNamespaceMap.set(MessageKind.MergeRequestCommit, "mergeRequestCommit");

crawlNamespaceMap.set(MessageKind.MergeRequestNote, "mergeRequestNote");

crawlNamespaceMap.set(MessageKind.Member, "member");

crawlNamespaceMap.set(MessageKind.NamespaceMember, "member");

crawlNamespaceMap.set(MessageKind.MemberInfo, "memberInfo");

crawlNamespaceMap.set(MessageKind.MergeRequestCommit, "defaultBranchCommit");

crawlNamespaceMap.set(MessageKind.Deployment, "deployment");

crawlNamespaceMap.set(MessageKind.DeploymentStatus, "deployment-status");

export const handler = QueueHandler(messageHandlers, logMap, crawlNamespaceMap);

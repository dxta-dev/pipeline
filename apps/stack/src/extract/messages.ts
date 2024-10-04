import { z } from "zod";

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
  from: z.coerce.date(),
  to: z.coerce.date(),
  crawlId: z.number(),
  dbUrl: z.string(),
});

export enum MessageKind {
  Tenant = 'tenant',
  Repository = 'repository',
  MemberInfo = "member-info",
  NamespaceMember = "namespace-member",
  Member = "member",
  MergeRequest = "merge-request",
  MergeRequestDiff = "merge-request-diff",
  MergeRequestCommit = "merge-request-commit",
  MergeRequestNote = "merge-request-note",
  TimelineEvent = "timeline-event",
  WorkflowDeployments = "workflow-deployments",
  DefaultBranchCommit = 'default-branch-commit',
  Deployment = "deployment",
  DeploymentStatus = "deployment-status",
  WorkflowDeploymentStatus = "workflow-deployment-status",
};


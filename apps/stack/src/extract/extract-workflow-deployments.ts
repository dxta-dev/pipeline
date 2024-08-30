import { createMessageHandler } from "@stack/config/create-message";
import { MessageKind, metadataSchema } from "./messages";
import { NamespaceSchema, RepositorySchema, repositories, namespaces, repositoryShas, deployments } from "@dxta/extract-schema";
import { cicdDeployWorkflows } from '@dxta/tenant-schema';
import { z } from "zod";
import { type OmitDb, getTenantDb } from "@stack/config/get-tenant-db";
import type { Context, GetWorkflowDeploymentsEntities, GetWorkflowDeploymentsSourceControl } from "@dxta/extract-functions";
import { getWorkflowDeployments } from '@dxta/extract-functions';
import { GitHubSourceControl, GitlabSourceControl } from "@dxta/source-control";
import { getClerkUserToken } from "./get-clerk-user-token";
import { EventHandler } from "@stack/config/create-event";
import { extractRepositoryEvent } from "./events";
import { and, eq } from "drizzle-orm";
import { Config } from "sst/node/config";

export const workflowDeploymentsSenderHandler = createMessageHandler({
  queueId: 'ExtractQueue',
  kind: MessageKind.WorkflowDeployments,
  metadataShape: metadataSchema.shape,
  contentShape: z.object({
    repository: RepositorySchema,
    namespace: NamespaceSchema,
    workflowId: z.number(),
    branch: z.string().optional(),
    page: z.number().optional(),
    perPage: z.number(),
  }).shape,
  handler: async (message) => {
    const { userId, sourceControl, from, to, tenantId } = message.metadata;
    const { namespace, repository, workflowId, branch, perPage, page } = message.content;

    context.integrations.sourceControl = await initSourceControl(userId, sourceControl);

    await getWorkflowDeployments({
      namespace,
      repository,
      timePeriod: { from, to },
      workflowId,
      branch,
      perPage,
      page,
    }, { db: getTenantDb(tenantId), ...context });

  }
});

const { sender } = workflowDeploymentsSenderHandler;

const initSourceControl = async (userId: string, sourceControl: 'github' | 'gitlab') => {
  const accessToken = await getClerkUserToken(userId, `oauth_${sourceControl}`);
  if (sourceControl === 'github') return new GitHubSourceControl({ auth: accessToken });
  if (sourceControl === 'gitlab') return new GitlabSourceControl(accessToken);
  return null;
}

const context: OmitDb<Context<GetWorkflowDeploymentsSourceControl, GetWorkflowDeploymentsEntities>> = {
  entities: {
    deployments,
    repositoryShas
  },
  integrations: {
    sourceControl: null,
  },
};

export const eventHandler = EventHandler(extractRepositoryEvent, async (ev) => {
  const db = getTenantDb(ev.metadata.tenantId);
  const repository = await db.select().from(repositories).where(eq(repositories.id, ev.properties.repositoryId)).get();
  const namespace = await db.select().from(namespaces).where(eq(namespaces.id, ev.properties.namespaceId)).get();

  if (!repository) throw new Error("invalid repo id");
  if (!namespace) throw new Error("Invalid namespace id");

  const workflows = await db.select().from(cicdDeployWorkflows).where(
    and(
      eq(cicdDeployWorkflows.repositoryExternalId, repository.externalId),
      eq(cicdDeployWorkflows.forgeType, repository.forgeType)
    )
  ).all();

  if (workflows.length == 0) {
    console.log("No deployment workflows defined for repository", `${namespace.name}/${repository.name}`);
    return;
  }

  context.integrations.sourceControl = await initSourceControl(ev.metadata.userId, ev.metadata.sourceControl);

  const workflowDeploymentsFirstPages = await Promise.all(workflows.map(workflow => getWorkflowDeployments({
    repository,
    namespace,
    page: 1,
    perPage: Number(Config.PER_PAGE),
    timePeriod: { from: ev.metadata.from, to: ev.metadata.to },
    workflowId: workflow.workflowExternalid,
    branch: workflow.branch || undefined,
  }, { db: getTenantDb(ev.metadata.tenantId), ...context }).then(result => ({ workflow, result }))));

  const arrayOfExtractDeploymentsPageMessageContent: Parameters<typeof workflowDeploymentsSenderHandler.sender.send>[0][] = [];
  for (const firstPage of workflowDeploymentsFirstPages) {
    for (let i = 2; i <= firstPage.result.paginationInfo.totalPages; i++) {
      arrayOfExtractDeploymentsPageMessageContent.push({
        namespace,
        repository,
        page: i,
        perPage: firstPage.result.paginationInfo.perPage,
        workflowId: firstPage.workflow.workflowExternalid,
        branch: firstPage.workflow.branch || undefined,
      })
    }
  }

  await sender.sendAll(arrayOfExtractDeploymentsPageMessageContent, {
    version: 1,
    caller: 'extract-cicd-runs.eventHandler',
    sourceControl: ev.metadata.sourceControl,
    userId: ev.metadata.userId,
    timestamp: new Date().getTime(),
    from: ev.metadata.from,
    to: ev.metadata.to,
    crawlId: ev.metadata.crawlId,
    tenantId: ev.metadata.tenantId,
  });

}, {
  propertiesToLog: ["properties.repositoryId", "properties.namespaceId"],
});
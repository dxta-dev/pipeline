import { createMessageHandler } from "@stack/config/create-message";
import { MessageKind, metadataSchema } from "./messages";
import { NamespaceSchema, RepositorySchema, repositories, namespaces, repositoryShas, deployments } from "@dxta/extract-schema";
import { cicdDeployWorkflows } from '@dxta/tenant-schema';
import { z } from "zod";
import type { Context, GetWorkflowDeploymentsEntities, GetWorkflowDeploymentsSourceControl } from "@dxta/extract-functions";
import { getWorkflowDeployments } from '@dxta/extract-functions';
import { EventHandler } from "@stack/config/create-event";
import { extractRepositoryEvent } from "./events";
import { and, eq } from "drizzle-orm";
import { Config } from "sst/node/config";
import { initDatabase, initIntegrations } from "./context";

type ExtractWorkflowDeploymentsContext = Context<GetWorkflowDeploymentsSourceControl, GetWorkflowDeploymentsEntities>;

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
    const { from, to } = message.metadata;
    const { namespace, repository, workflowId, branch, perPage, page } = message.content;

    const dynamicContext = {
      integrations: await initIntegrations(message.metadata),
      db: initDatabase(message.metadata),
    } satisfies Partial<ExtractWorkflowDeploymentsContext>;

    await getWorkflowDeployments({
      namespace,
      repository,
      timePeriod: { from, to },
      workflowId,
      branch,
      perPage,
      page,
    }, { ...staticContext, ...dynamicContext });

  }
});

const { sender } = workflowDeploymentsSenderHandler;

const staticContext = {
  entities: {
    deployments,
    repositoryShas
  },
} satisfies Partial<ExtractWorkflowDeploymentsContext>;

export const eventHandler = EventHandler(extractRepositoryEvent, async (ev) => {
  const db = initDatabase(ev.metadata);
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

  const dynamicContext = {
    integrations: await initIntegrations(ev.metadata),
    db,
  } satisfies Partial<ExtractWorkflowDeploymentsContext>;

  const workflowDeploymentsFirstPages = await Promise.all(workflows.map(workflow => getWorkflowDeployments({
    repository,
    namespace,
    page: 1,
    perPage: Number(Config.PER_PAGE),
    timePeriod: { from: ev.metadata.from, to: ev.metadata.to },
    workflowId: workflow.workflowExternalid,
    branch: workflow.branch || undefined,
  }, { ...staticContext, ...dynamicContext }).then(result => ({ workflow, result }))));

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
    dbUrl: ev.metadata.dbUrl,
  });

}, {
  propertiesToLog: ["properties.repositoryId", "properties.namespaceId"],
});

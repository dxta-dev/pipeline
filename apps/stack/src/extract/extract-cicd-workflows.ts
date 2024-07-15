import { createMessageHandler } from "@stack/config/create-message";
import { MessageKind, metadataSchema, paginationSchema } from "./messages";
import { NamespaceSchema, RepositorySchema, cicdWorkflows, repositories, namespaces } from "@dxta/extract-schema";
import type { Namespace, Repository } from '@dxta/extract-schema'
import { z } from "zod";
import { type OmitDb, getTenantDb } from "@stack/config/get-tenant-db";
import type { Context, GetCicdWorkflowsEntities, GetCicdWorkflowsSourceControl } from "@dxta/extract-functions";
import { getCicdWorkflows } from '@dxta/extract-functions';
import { GitHubSourceControl, GitlabSourceControl, type Pagination } from "@dxta/source-control";
import { getClerkUserToken } from "./get-clerk-user-token";
import { EventHandler } from "@stack/config/create-event";
import { extractRepositoryEvent } from "./events";
import { eq } from "drizzle-orm";
import { Config } from "sst/node/config";
import { insertEvent } from "@dxta/crawl-functions";
import { events } from "@dxta/crawl-schema";

export const workflowsSenderHandler = createMessageHandler({
  queueId: 'ExtractQueue',
  kind: MessageKind.Workflow,
  metadataShape: metadataSchema.shape,
  contentShape: z.object({
    repository: RepositorySchema,
    namespace: NamespaceSchema,
    pagination: paginationSchema,
  }).shape,
  handler: async (message) => {
    await extractCicdWorkflowsPage({
      crawlId: message.metadata.crawlId,
      namespace: message.content.namespace,
      paginationInput: message.content.pagination,
      repository: message.content.repository,
      sourceControl: message.metadata.sourceControl,
      userId: message.metadata.userId,
      tenantId: message.metadata.tenantId,
    });
  }
});

const { sender } = workflowsSenderHandler;

const initSourceControl = async (userId: string, sourceControl: 'github' | 'gitlab') => {
  const accessToken = await getClerkUserToken(userId, `oauth_${sourceControl}`);
  if (sourceControl === 'github') return new GitHubSourceControl({ auth: accessToken });
  if (sourceControl === 'gitlab') return new GitlabSourceControl(accessToken);
  return null;
}

const context: OmitDb<Context<GetCicdWorkflowsSourceControl, GetCicdWorkflowsEntities>> = {
  entities: {
    cicdWorkflows,
  },
  integrations: {
    sourceControl: null,
  },
};

type ExtractCicdWorkflowsPageInput = {
  namespace: Namespace;
  repository: Repository;
  sourceControl: "github" | "gitlab";
  userId: string;
  paginationInput: Pick<Pagination, "page" | "perPage">;
  crawlId: number;
  tenantId: number;
}

const extractCicdWorkflowsPage = async ({
  namespace, repository,
  sourceControl, userId,
  paginationInput,
  crawlId: _crawlId, tenantId
}: ExtractCicdWorkflowsPageInput) => {

  context.integrations.sourceControl = await initSourceControl(userId, sourceControl);
  const { paginationInfo } = await getCicdWorkflows({
    namespace, repository,
    perPage: paginationInput.perPage,
    page: paginationInput.page,
  }, { ...context, db: getTenantDb(tenantId) });

  return { pagination: paginationInfo };
}

export const eventHandler = EventHandler(extractRepositoryEvent, async (ev) => {
  const db = getTenantDb(ev.metadata.tenantId);
  const repository = await db.select().from(repositories).where(eq(repositories.id, ev.properties.repositoryId)).get();
  const namespace = await db.select().from(namespaces).where(eq(namespaces.id, ev.properties.namespaceId)).get();

  if (!repository) throw new Error("invalid repo id");
  if (!namespace) throw new Error("Invalid namespace id");

  const { pagination } = await extractCicdWorkflowsPage({
    namespace: namespace,
    repository: repository,
    sourceControl: ev.metadata.sourceControl,
    userId: ev.metadata.userId,
    paginationInput: {
      page: 1,
      perPage: Number(Config.PER_PAGE),
    },
    crawlId: ev.metadata.crawlId,
    tenantId: ev.metadata.tenantId,
  });

  const arrayOfExtractWorkflowPageMessageContent: Parameters<typeof workflowsSenderHandler.sender.send>[0][] = [];
  for (let i = 2; i <= pagination.totalPages; i++) {
    arrayOfExtractWorkflowPageMessageContent.push({
      namespace,
      repository,
      pagination: {
        page: i,
        perPage: pagination.perPage,
        totalPages: pagination.totalPages
      }
    });
  }

  await insertEvent(
    { crawlId: ev.metadata.crawlId, eventNamespace: 'workflow', eventDetail: 'crawlInfo', data: { calls: pagination.totalPages } },
    { db, entities: { events } }
  );

  if (arrayOfExtractWorkflowPageMessageContent.length === 0) {
    return;
  }

  await sender.sendAll(arrayOfExtractWorkflowPageMessageContent, {
    version: 1,
    caller: 'extract-cicd-workflows',
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
  crawlEventNamespace: "workflow",
});

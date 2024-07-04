import { Config } from "sst/node/config";

import { type Context, type GetDeploymentsSourceControl, type GetDeploymentsEntities, getDeployments } from "@dxta/extract-functions";
import { deployments, namespaces, repositories, NamespaceSchema, RepositorySchema } from "@dxta/extract-schema";
import type { Namespace, Repository } from "@dxta/extract-schema";
import { getTenantDb, type OmitDb } from "@stack/config/get-tenant-db";
import { GitHubSourceControl, GitlabSourceControl } from "@dxta/source-control";
import type { Pagination } from "@dxta/source-control";

import { z } from 'zod';
import { metadataSchema, paginationSchema, MessageKind } from "./messages";
import { createMessageHandler } from "@stack/config/create-message";

import { getClerkUserToken } from "./get-clerk-user-token";
import { EventHandler } from "@stack/config/create-event";
import { extractRepositoryEvent } from "./events";

import { insertEvent } from "@dxta/crawl-functions";
import { events } from "@dxta/crawl-schema";
import { eq } from "drizzle-orm";


export const deploymentsSenderHandler = createMessageHandler({
  queueId: 'ExtractQueue',
  kind: MessageKind.Deployment,
  metadataShape: metadataSchema.shape,
  contentShape: z.object({
    repository: RepositorySchema,
    namespace: NamespaceSchema,
    pagination: paginationSchema,
  }).shape,
  handler: async (message) => {
    await extractDeploymentsPage({
      namespace: message.content.namespace,
      paginationInput: message.content.pagination,
      repository: message.content.repository,
      sourceControl: message.metadata.sourceControl,
      userId: message.metadata.userId,
      tenantId: message.metadata.tenantId,
    } satisfies ExtractDeploymentsPageInput);
  }
});

const { sender } = deploymentsSenderHandler;

const initSourceControl = async (userId: string, sourceControl: 'github' | 'gitlab') => {
  const accessToken = await getClerkUserToken(userId, `oauth_${sourceControl}`);
  if (sourceControl === 'github') return new GitHubSourceControl({ auth: accessToken });
  if (sourceControl === 'gitlab') return new GitlabSourceControl(accessToken);
  return null;
}

const context: OmitDb<Context<GetDeploymentsSourceControl, GetDeploymentsEntities>> = {
  entities: {
    deployments,
  },
  integrations: {
    sourceControl: null,
  },
};

type ExtractDeploymentsPageInput = {
  namespace: Namespace;
  repository: Repository;
  userId: string;
  sourceControl: "github" | "gitlab";
  tenantId: number;
  paginationInput: Pick<Pagination, "page" | "perPage">;
}

const extractDeploymentsPage = async ({ repository, namespace, userId, sourceControl, tenantId, paginationInput }: ExtractDeploymentsPageInput) => {
  context.integrations.sourceControl = await initSourceControl(userId, sourceControl);

  const { deployments, paginationInfo } = await getDeployments({
    repositoryId: repository.id,
    externalRepositoryId: repository.externalId,
    repositoryName: repository.name,
    namespaceName: namespace.name,
    perPage: paginationInput.perPage,
    page: paginationInput.page,
  }, { ...context, db: getTenantDb(tenantId) });

  return { deployments, pagination: paginationInfo };
}

export const eventHandler = EventHandler(extractRepositoryEvent, async (ev)=> {
  const db = getTenantDb(ev.metadata.tenantId);
  const repository = await db.select().from(repositories).where(eq(repositories.id, ev.properties.repositoryId)).get();
  const namespace = await db.select().from(namespaces).where(eq(namespaces.id, ev.properties.namespaceId)).get();

  if (!repository) throw new Error("invalid repo id");
  if (!namespace) throw new Error("Invalid namespace id");

  const { pagination } = await extractDeploymentsPage({
    namespace: namespace,
    repository: repository,
    userId: ev.metadata.userId,
    sourceControl: ev.metadata.sourceControl,
    tenantId: ev.metadata.tenantId,
    paginationInput: {
      page: 1,
      perPage: Number(Config.PER_PAGE),
    },
  } satisfies ExtractDeploymentsPageInput);

  const arrayOfExtractDeploymentPageMessageContent: { repository: Repository, namespace: Namespace, pagination: Pagination }[] = [];
  for (let i = 2; i <= pagination.totalPages; i++) {
    arrayOfExtractDeploymentPageMessageContent.push({
      namespace: namespace,
      repository: repository,
      pagination: {
        page: i,
        perPage: pagination.perPage,
        totalPages: pagination.totalPages
      }
    })
  }

  if (arrayOfExtractDeploymentPageMessageContent.length === 0) return;

  await insertEvent(
    { crawlId: ev.metadata.crawlId, eventNamespace: 'deployment', eventDetail: 'crawlInfo', data: { calls: pagination.totalPages } },
    { db, entities: { events } }
  );

  await sender.sendAll(arrayOfExtractDeploymentPageMessageContent, {
    version: 1,
    caller: 'extract-deployments',
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
  crawlEventNamespace: "deployment",  
})
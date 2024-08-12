import { createMessageHandler } from "@stack/config/create-message";
import { MessageKind, metadataSchema } from "./messages";
import { z } from "zod";
import { NamespaceSchema, RepositorySchema, repositoryCommits as commits, deployments, repositories, namespaces } from "@dxta/extract-schema";
import type { Namespace, Repository } from "@dxta/extract-schema";
import type { Context, GetDeploymentsEntities, GetDeploymentsSourceControl } from "@dxta/extract-functions";
import { getDeployments } from "@dxta/extract-functions";
import { type OmitDb, getTenantDb } from "@stack/config/get-tenant-db";
import { Config } from "sst/node/config";
import { getClerkUserToken } from "./get-clerk-user-token";
import { GitHubSourceControl, GitlabSourceControl } from "@dxta/source-control";
import { EventHandler } from "@stack/config/create-event";
import { extractRepositoryEvent } from "./events";
import { and, eq } from "drizzle-orm";
import { deploymentEnvironments } from "@dxta/tenant-schema";

type ExtractDeploymentsPageInput = {
  namespace: Namespace;
  repository: Repository;
  environment?: string;
  perPage: number;
  page: number;
  userId: string;
  sourceControl: "github" | "gitlab";
  tenantId: number;
}
const extractDeploymentsPage = async ({
  namespace,
  repository,
  environment,
  perPage,
  page,
  userId,
  sourceControl,
  tenantId,
}: ExtractDeploymentsPageInput) => {
  context.integrations.sourceControl = await initSourceControl(userId, sourceControl);

  const { paginationInfo: pagination, deployments } = await getDeployments({
    namespace,
    repository,
    environment,
    page,
    perPage,
  }, { ...context, db: getTenantDb(tenantId) });

  const isYoungerThan = (a: Date | null, b: Date | null, maxAgeMs: number) => {
    if (!a || !b) return true;
    return (b.getTime() - a.getTime()) < maxAgeMs;
  }

  const numberOfDeploymentsYoungerThanMaxAge = deployments.filter(d => isYoungerThan(d._createdAt, d._updatedAt, 10 * 60 * 1000)).length;

  const hasNextPage = (pagination.page < pagination.totalPages) && (numberOfDeploymentsYoungerThanMaxAge === pagination.perPage);

  return {
    nextPage: hasNextPage ? {
      page: page + 1,
      perPage: pagination.perPage,
    } : null
  };
}

const initSourceControl = async (userId: string, sourceControl: 'github' | 'gitlab') => {
  const accessToken = await getClerkUserToken(userId, `oauth_${sourceControl}`);
  if (sourceControl === 'github') return new GitHubSourceControl({ auth: accessToken });
  if (sourceControl === 'gitlab') return new GitlabSourceControl(accessToken);
  return null;
}
const context: OmitDb<Context<GetDeploymentsSourceControl, GetDeploymentsEntities>> = {
  entities: {
    commits,
    deployments,
  },
  integrations: {
    sourceControl: null,
  },
};

export const deploymentsSenderHandler = createMessageHandler({
  queueId: 'ExtractQueue',
  kind: MessageKind.Deployment,
  metadataShape: metadataSchema.shape,
  contentShape: z.object({
    repository: RepositorySchema,
    namespace: NamespaceSchema,
    environment: z.string().optional(),
    perPage: z.number(),
    page: z.number(),
  }).shape,
  handler: async (message) => {
    const { repository, namespace, environment, page, perPage } = message.content;
    const { from, to, userId, sourceControl, tenantId, crawlId } = message.metadata;

    const { nextPage } = await extractDeploymentsPage({
      namespace,
      repository,
      environment,
      perPage,
      page,
      userId,
      sourceControl,
      tenantId
    });

    if (!nextPage) return;

    await sender.send({
      repository,
      namespace,
      environment,
      page: nextPage.page,
      perPage: nextPage.perPage,
    }, {
      version: 1,
      caller: 'extract-deployments',
      sourceControl,
      userId,
      timestamp: new Date().getTime(),
      from,
      to,
      crawlId,
      tenantId,
    });

  }
});

const { sender } = deploymentsSenderHandler;

export const eventHandler = EventHandler(extractRepositoryEvent, async (ev) => {
  const { crawlId, from, to, userId, sourceControl, tenantId } = ev.metadata;

  const db = getTenantDb(tenantId);
  const repository = await db.select().from(repositories).where(eq(repositories.id, ev.properties.repositoryId)).get();
  const namespace = await db.select().from(namespaces).where(eq(namespaces.id, ev.properties.namespaceId)).get();

  if (!repository) throw new Error("invalid repo id");
  if (!namespace) throw new Error("Invalid namespace id");

  const environments = await db.select().from(deploymentEnvironments).where(
    and(
      eq(deploymentEnvironments.repositoryExternalId, repository.externalId),
      eq(deploymentEnvironments.forgeType, repository.forgeType)
    )
  ).all();

  if (environments.length == 0) {
    console.log("No deployment environments defined for repository", `${namespace.name}/${repository.name}`);
    return;
  }

  const arrayOfExtractDeploymentsPageMessageContent: Parameters<typeof deploymentsSenderHandler.sender.send>[0][] = environments.map(env => ({
    repository,
    namespace,
    environment: env.environment,
    page: 1,
    perPage: Number(Config.PER_PAGE),
  }))

  await sender.sendAll(arrayOfExtractDeploymentsPageMessageContent, {
    version: 1,
    caller: 'extract-deployments',
    sourceControl,
    userId,
    timestamp: new Date().getTime(),
    from,
    to,
    crawlId,
    tenantId,
  });

}, {
  propertiesToLog: ["properties.repositoryId", "properties.namespaceId"],
  crawlEventNamespace: "deployment",
})
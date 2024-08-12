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
import { eq } from "drizzle-orm";
import { insertEvent } from "@dxta/crawl-functions";
import { events } from "@dxta/crawl-schema";

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

  const { paginationInfo: pagination } = await getDeployments({
    namespace,
    repository,
    environment,
    page,
    perPage,
  }, { ...context, db: getTenantDb(tenantId) });

  return { pagination };
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

export const commitsSenderHandler = createMessageHandler({
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
    const { userId, sourceControl, tenantId } = message.metadata;

    await extractDeploymentsPage({
      namespace,
      repository,
      environment,
      perPage,
      page,
      userId,
      sourceControl,
      tenantId
    });

  }
});

const { sender } = commitsSenderHandler;

export const eventHandler = EventHandler(extractRepositoryEvent, async (ev) => {
  const { crawlId, from, to, userId, sourceControl, tenantId } = ev.metadata;

  const db = getTenantDb(tenantId);
  const repository = await db.select().from(repositories).where(eq(repositories.id, ev.properties.repositoryId)).get();
  const namespace = await db.select().from(namespaces).where(eq(namespaces.id, ev.properties.namespaceId)).get();

  if (!repository) throw new Error("invalid repo id");
  if (!namespace) throw new Error("Invalid namespace id");

  const { } = await extractDeploymentsPage({
    namespace,
    repository,
    environment: undefined,
    page: 1,
    perPage: Number(Config.PER_PAGE),
    sourceControl,
    tenantId,
    userId
  });

  await insertEvent(
    { crawlId, eventNamespace: 'defaultBranchCommit', eventDetail: 'crawlInfo', data: { calls: -1 } }, // Issue: can't determine number of calls beforehand
    { db, entities: { events } }
  );

  await sender.send({
    repository,
    namespace,
    environment: undefined,
    page: 1,
    perPage: Number(Config.PER_PAGE),
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

}, {
  propertiesToLog: ["properties.repositoryId", "properties.namespaceId"],
  crawlEventNamespace: "deployment",
})
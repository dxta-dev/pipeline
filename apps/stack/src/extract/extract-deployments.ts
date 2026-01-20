import { createMessageHandler } from "@stack/config/create-message";
import { MessageKind, metadataSchema } from "./messages";
import { z } from "zod";
import {
  NamespaceSchema,
  RepositorySchema,
  deployments,
  repositories,
  namespaces,
  repositoryShas,
} from "@dxta/extract-schema";
import type { Namespace, Repository } from "@dxta/extract-schema";
import type {
  Context,
  GetDeploymentsEntities,
  GetDeploymentsSourceControl,
} from "@dxta/extract-functions";
import { getDeployments } from "@dxta/extract-functions";
import { Config } from "sst/node/config";
import { EventHandler } from "@stack/config/create-event";
import { extractDeploymentsEvent, extractRepositoryEvent } from "./events";
import { and, eq } from "drizzle-orm";
import { deploymentEnvironments } from "@dxta/tenant-schema";
import { initDatabase, initSourceControl } from "./context";

type ExtractDeploymentsContext = Context<
  GetDeploymentsSourceControl,
  GetDeploymentsEntities
>;

type ExtractDeploymentsPageInput = {
  namespace: Namespace;
  repository: Repository;
  environment?: string;
  from: Date;
  to: Date;
  perPage: number;
  page: number;
  userId: string;
  sourceControl: "github" | "gitlab";
  dbUrl: string;
  crawlId: number;
};
// EXPORTED ONLY FOR ./extract-initial-deployments.ts
export const extractDeploymentsPage = async ({
  namespace,
  repository,
  environment,
  perPage,
  page,
  from,
  to,
  userId,
  sourceControl,
  dbUrl,
  crawlId,
}: ExtractDeploymentsPageInput) => {
  const dynamicContext = {
    integrations: {
      sourceControl: await initSourceControl({ userId, sourceControl }),
    },
    db: initDatabase({ dbUrl }),
  } satisfies Partial<ExtractDeploymentsContext>;

  const { paginationInfo: pagination, deployments } = await getDeployments(
    {
      namespace,
      repository,
      environment,
      page,
      perPage,
    },
    { ...staticContext, ...dynamicContext },
  );

  const deploymentsWithUndeterminedStatus = deployments
    .filter((d) => d.status === null)
    .map((deployment) => deployment.id);

  if (deploymentsWithUndeterminedStatus.length !== 0) {
    await extractDeploymentsEvent.publish(
      {
        namespaceId: namespace.id,
        repositoryId: repository.id,
        deploymentIds: deploymentsWithUndeterminedStatus,
      },
      {
        version: 1,
        caller: "extract-deployments",
        sourceControl,
        userId,
        timestamp: new Date().getTime(),
        from,
        to,
        crawlId,
        dbUrl,
      },
    );
  }

  return {
    pagination,
    deployments,
  };
};

const staticContext = {
  entities: {
    repositoryShas,
    deployments,
  },
} satisfies Partial<ExtractDeploymentsContext>;

export const deploymentsSenderHandler = createMessageHandler({
  queueId: "ExtractQueue",
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
    const { repository, namespace, environment, page, perPage } =
      message.content;
    const { from, to, userId, sourceControl, dbUrl, crawlId } =
      message.metadata;

    await extractDeploymentsPage({
      namespace,
      repository,
      environment,
      perPage,
      page,
      from,
      to,
      userId,
      sourceControl,
      dbUrl,
      crawlId,
    });
  },
});

export const eventHandler = EventHandler(
  extractRepositoryEvent,
  async (ev) => {
    const { crawlId, from, to, userId, sourceControl, dbUrl } = ev.metadata;

    const db = initDatabase(ev.metadata);
    const repository = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, ev.properties.repositoryId))
      .get();
    const namespace = await db
      .select()
      .from(namespaces)
      .where(eq(namespaces.id, ev.properties.namespaceId))
      .get();

    if (!repository) throw new Error("invalid repo id");
    if (!namespace) throw new Error("Invalid namespace id");

    const environments = await db
      .select()
      .from(deploymentEnvironments)
      .where(
        and(
          eq(
            deploymentEnvironments.repositoryExternalId,
            repository.externalId,
          ),
          eq(deploymentEnvironments.forgeType, repository.forgeType),
        ),
      )
      .all();

    if (environments.length == 0) {
      console.log(
        "No deployment environments defined for repository",
        `${namespace.name}/${repository.name}`,
      );
      return;
    }

    const _deploymentsFirstPages = await Promise.all(
      environments.map((environment) =>
        extractDeploymentsPage({
          namespace,
          repository,
          environment: environment.environment,
          perPage: Number(Config.PER_PAGE),
          page: 1,
          from,
          to,
          userId,
          sourceControl,
          dbUrl,
          crawlId,
        }).then((result) => ({ result, deploymentEnvironment: environment })),
      ),
    );
  },
  {
    propertiesToLog: ["properties.repositoryId", "properties.namespaceId"],
    crawlEventNamespace: "deployment",
  },
);

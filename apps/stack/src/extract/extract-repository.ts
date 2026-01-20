import { extractRepositoryEvent } from "./events";
import { getRepository } from "@dxta/extract-functions";
import type {
  Context,
  GetRepositorySourceControl,
  GetRepositoryEntities,
} from "@dxta/extract-functions";
import {
  repositories,
  namespaces,
  RepositorySchema,
  NamespaceSchema,
} from "@dxta/extract-schema";
import { instances } from "@dxta/crawl-schema";
import { z } from "zod";
import { setInstance } from "@dxta/crawl-functions";
import { MessageKind, metadataSchema } from "./messages";
import { createMessageHandler } from "@stack/config/create-message";
import { initDatabase, initSourceControl } from "./context";

type ExtractRepositoryContext = Context<
  GetRepositorySourceControl,
  GetRepositoryEntities
>;

const staticContext = {
  entities: {
    repositories,
    namespaces,
  },
} satisfies Partial<ExtractRepositoryContext>;

const inputSchema = z.object({
  repositoryId: z.number(),
  repositoryName: z.string(),
  namespaceName: z.string(),
  sourceControl: z.literal("gitlab").or(z.literal("github")),
  from: z.coerce.date(),
  to: z.coerce.date(),
  dbUrl: z.string(),
});

type Input = z.infer<typeof inputSchema>;
const extractRepository = async (input: Input, userId: string) => {
  const {
    dbUrl,
    repositoryId,
    repositoryName,
    namespaceName,
    sourceControl,
    from,
    to,
  } = input;
  const db = initDatabase({ dbUrl });

  const dynamicContext = {
    integrations: {
      sourceControl: await initSourceControl({ userId, sourceControl }),
    },
    db,
  } satisfies Partial<ExtractRepositoryContext>;

  const { repository, namespace } = await getRepository(
    { externalRepositoryId: repositoryId, repositoryName, namespaceName },
    { ...staticContext, ...dynamicContext },
  );

  const { instanceId } = await setInstance(
    { repositoryId: repository.id, userId, since: from, until: to },
    { db, entities: { instances } },
  );

  await extractRepositoryEvent.publish(
    {
      repositoryId: repository.id,
      namespaceId: namespace.id,
    },
    {
      crawlId: instanceId,
      caller: "extract-repository",
      timestamp: new Date().getTime(),
      version: 1,
      sourceControl,
      userId,
      from,
      to,
      dbUrl,
    },
  );
};

export const repositorySenderHandler = createMessageHandler({
  queueId: "ExtractQueue",
  kind: MessageKind.Repository,
  metadataShape: metadataSchema.omit({ sourceControl: true, crawlId: true })
    .shape,
  contentShape: z.object({
    externalRepositoryId: RepositorySchema.shape.externalId,
    forgeType: RepositorySchema.shape.forgeType,
    repositoryName: RepositorySchema.shape.name,
    namespaceName: NamespaceSchema.shape.name,
  }).shape,
  handler: async (message) => {
    await extractRepository(
      {
        repositoryId: message.content.externalRepositoryId,
        namespaceName: message.content.namespaceName,
        repositoryName: message.content.repositoryName,
        from: message.metadata.from,
        to: message.metadata.to,
        sourceControl: message.content.forgeType,
        dbUrl: message.metadata.dbUrl,
      },
      message.metadata.userId,
    );
  },
});

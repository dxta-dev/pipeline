import { createMessageHandler } from "@stack/config/create-message";
import { MessageKind, metadataSchema } from "./messages";
import { z } from "zod";
import { NamespaceSchema, RepositorySchema, repositoryCommits as commits, repositoryShaTrees, repositories, namespaces, repositoryShas } from "@dxta/extract-schema";
import type { Namespace, Repository } from "@dxta/extract-schema";
import type { Context, GetCommitsEntities, GetCommitsSourceControl } from "@dxta/extract-functions";
import { getCommits } from "@dxta/extract-functions";
import { Config } from "sst/node/config";
import { EventHandler } from "@stack/config/create-event";
import { extractRepositoryEvent } from "./events";
import { eq } from "drizzle-orm";
import { insertEvent } from "@dxta/crawl-functions";
import { events } from "@dxta/crawl-schema";
import { initDatabase, initSourceControl } from "./context";

type ExtractDefaultBranchCommitsContext = Context<GetCommitsSourceControl, GetCommitsEntities>;

type ExtractDefaultBranchCommitsPageInput = {
  namespace: Namespace;
  repository: Repository;
  from: Date;
  to: Date;
  perPage: number;
  page: number;
  userId: string;
  sourceControl: "github" | "gitlab";
  dbUrl: string;
}
const extractDefaultBranchCommitsPage = async ({
  namespace,
  repository,
  from,
  to,
  perPage,
  page,
  userId,
  sourceControl,
  dbUrl,
}: ExtractDefaultBranchCommitsPageInput) => {

  const dynamicContext = {
    integrations: { sourceControl: await initSourceControl({ userId, sourceControl }) },
    db: initDatabase({ dbUrl })
  } satisfies Partial<ExtractDefaultBranchCommitsContext>;

  const { paginationInfo: pagination } = await getCommits({
    namespace,
    repository,
    ref: repository.defaultBranch ?? undefined,
    timePeriod: { from, to },
    perPage,
    page,
  }, { ...staticContext, ...dynamicContext });

  return { pagination };
}

const staticContext = {
  entities: {
    commits,
    repositoryShaTrees,
    repositoryShas
  },
} satisfies Partial<ExtractDefaultBranchCommitsContext>;

export const commitsSenderHandler = createMessageHandler({
  queueId: 'ExtractQueue',
  kind: MessageKind.DefaultBranchCommit,
  metadataShape: metadataSchema.shape,
  contentShape: z.object({
    repository: RepositorySchema,
    namespace: NamespaceSchema,
    perPage: z.number(),
    page: z.number(),
  }).shape,
  handler: async (message) => {
    const { repository, namespace, page, perPage } = message.content;
    const { from, to, userId, sourceControl, dbUrl } = message.metadata;

    await extractDefaultBranchCommitsPage({
      namespace,
      repository,
      from,
      to,
      perPage,
      page,
      userId,
      sourceControl,
      dbUrl
    });
  }
});

const { sender } = commitsSenderHandler;

export const eventHandler = EventHandler(extractRepositoryEvent, async (ev) => {
  const { crawlId, from, to, userId, sourceControl, dbUrl } = ev.metadata;

  const db = initDatabase(ev.metadata);
  const repository = await db.select().from(repositories).where(eq(repositories.id, ev.properties.repositoryId)).get();
  const namespace = await db.select().from(namespaces).where(eq(namespaces.id, ev.properties.namespaceId)).get();


  if (!repository) throw new Error("invalid repo id");
  if (!namespace) throw new Error("Invalid namespace id");
  const { pagination } = await extractDefaultBranchCommitsPage({
    namespace,
    repository,
    from,
    to,
    perPage: Number(Config.PER_PAGE),
    page: 1,
    sourceControl,
    dbUrl,
    userId
  });

  const arrayOfExtractDefaultBranchCommitsPageMessageContent: Parameters<typeof commitsSenderHandler.sender.send>[0][] = [];
  for (let i = 2; i <= pagination.totalPages; i++) {
    arrayOfExtractDefaultBranchCommitsPageMessageContent.push({
      repository,
      namespace,
      page: i,
      perPage: pagination.perPage,
    });
  }
  await insertEvent(
    { crawlId, eventNamespace: 'defaultBranchCommit', eventDetail: 'crawlInfo', data: { calls: pagination.totalPages } },
    { db, entities: { events } }
  );

  if (arrayOfExtractDefaultBranchCommitsPageMessageContent.length === 0) {
    return;
  }

  await sender.sendAll(arrayOfExtractDefaultBranchCommitsPageMessageContent, {
    version: 1,
    caller: 'extract-default-branch-commits',
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
  crawlEventNamespace: "defaultBranchCommit",
})

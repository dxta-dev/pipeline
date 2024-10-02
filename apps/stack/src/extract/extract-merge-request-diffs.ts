import { Config } from "sst/node/config";
import type { Context, GetMergeRequestDiffsEntities, GetMergeRequestDiffsSourceControl } from "@dxta/extract-functions";
import { getMergeRequestsDiffs } from "@dxta/extract-functions";
import { mergeRequestDiffs, mergeRequests, repositories, namespaces, MergeRequestSchema, RepositorySchema, NamespaceSchema } from "@dxta/extract-schema";
import { EventHandler } from "@stack/config/create-event";
import { extractMergeRequestsEvent } from "./events";
import { createMessageHandler } from "@stack/config/create-message";
import { MessageKind, metadataSchema } from "./messages";
import { z } from "zod";
import { insertEvent } from "@dxta/crawl-functions";
import { events } from "@dxta/crawl-schema";
import { initDatabase, initSourceControl } from "./context";

type ExtractMergeRequestDiffsContext = Context<GetMergeRequestDiffsSourceControl, GetMergeRequestDiffsEntities>;

export const mergeRequestDiffSenderHandler = createMessageHandler({
  queueId: 'ExtractQueue',
  kind: MessageKind.MergeRequestDiff,
  metadataShape: metadataSchema.shape,
  contentShape: z.object({
    mergeRequestId: MergeRequestSchema.shape.id,
    repositoryId: RepositorySchema.shape.id,
    namespaceId: NamespaceSchema.shape.id,
  }).shape,
  handler: async (message) => {
    const { mergeRequestId, repositoryId, namespaceId } = message.content;
    
    const dynamicContext = {
      integrations: { sourceControl: await initSourceControl(message.metadata) },
      db: initDatabase(message.metadata),
    } satisfies Partial<ExtractMergeRequestDiffsContext>;

    await getMergeRequestsDiffs({
      mergeRequestId,
      repositoryId,
      namespaceId,
      perPage: Number(Config.PER_PAGE),
    }, { ...staticContext, ...dynamicContext });
  }
});

const { sender } = mergeRequestDiffSenderHandler;

const staticContext = {
  entities: {
    mergeRequestDiffs,
    mergeRequests,
    namespaces,
    repositories
  },
} satisfies Partial<ExtractMergeRequestDiffsContext>;

export const eventHandler = EventHandler(extractMergeRequestsEvent, async (ev) => {
  const { sourceControl, userId } = ev.metadata;
  const { mergeRequestIds, repositoryId, namespaceId } = ev.properties;

  const arrayOfExtractMergeRequestData = [];
  for (let i = 0; i < mergeRequestIds.length; i += 1) {
    
    arrayOfExtractMergeRequestData.push({
      mergeRequestId: mergeRequestIds[i]!,
      namespaceId,
      repositoryId,
    })
  }
  await insertEvent(
    { crawlId: ev.metadata.crawlId, eventNamespace: 'mergeRequestDiff', eventDetail: 'crawlInfo', data: { calls: mergeRequestIds.length } },
    { db: initDatabase(ev.metadata), entities: { events } }
  );

  await sender.sendAll(arrayOfExtractMergeRequestData, {
    version: 1,
    crawlId: ev.metadata.crawlId,
    caller: 'extract-merge-request-diffs',
    sourceControl,
    userId,
    timestamp: new Date().getTime(),
    from: ev.metadata.from,
    to: ev.metadata.to,
    dbUrl: ev.metadata.dbUrl,
  });

});

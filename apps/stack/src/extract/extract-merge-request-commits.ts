import { getMergeRequestCommits, type Context, type GetMergeRequestCommitsEntities, type GetMergeRequestCommitsSourceControl } from "@dxta/extract-functions";
import { mergeRequestCommits, namespaces, repositories, mergeRequests, RepositorySchema, NamespaceSchema, MergeRequestSchema, members, repositoriesToMembers } from "@dxta/extract-schema";
import { EventHandler } from "@stack/config/create-event";
import { extractMembersEvent, extractMergeRequestsEvent } from "./events";
import { createMessageHandler } from "@stack/config/create-message";
import { MessageKind, metadataSchema } from "./messages";
import { z } from "zod";
import { insertEvent } from "@dxta/crawl-functions";
import { events } from "@dxta/crawl-schema";
import { filterNewExtractMembers } from "./filter-extract-members";
import { initDatabase, initIntegrations } from "./context";

type ExtractMergeRequestCommitsContext = Context<GetMergeRequestCommitsSourceControl, GetMergeRequestCommitsEntities>;

export const mrcsh = createMessageHandler({
  queueId: 'ExtractQueue',
  kind: MessageKind.MergeRequestCommit,
  metadataShape: metadataSchema.shape,
  contentShape: z.object({
    mergeRequestId: MergeRequestSchema.shape.id,
    repositoryId: RepositorySchema.shape.id,
    namespaceId: NamespaceSchema.shape.id,
  }).shape,
  handler: async (message) => {
    if (!message) {
      console.warn("Expected message to have content,but get empty")
      return;
    }

    const dynamicContext = {
      integrations: await initIntegrations(message.metadata),
      db: initDatabase(message.metadata),
    } satisfies Partial<ExtractMergeRequestCommitsContext>;

    const { userId, sourceControl } = message.metadata;
    const { mergeRequestId, namespaceId, repositoryId } = message.content;

    const { members } = await getMergeRequestCommits({
        mergeRequestId,
        namespaceId,
        repositoryId
      }, { ...staticContext, ...dynamicContext })

      const memberIds = filterNewExtractMembers(members).map(member => member.id);
      if (memberIds.length === 0) return;
  
      await extractMembersEvent.publish({ memberIds }, {
        crawlId: message.metadata.crawlId,
        version: 1,
        caller: 'extract-merge-request-commits',
        sourceControl,
        userId,
        timestamp: new Date().getTime(),
        from: message.metadata.from,
        to: message.metadata.to,
        dbUrl: message.metadata.dbUrl,
      });      
  }
});

const { sender } = mrcsh;

  const staticContext = {
  entities: {
    mergeRequestCommits,
    members,
    repositoriesToMembers,
    namespaces,
    repositories,
    mergeRequests,
  }
} satisfies Partial<ExtractMergeRequestCommitsContext>;


export const eventHandler = EventHandler(extractMergeRequestsEvent, async (ev) => {
  const { mergeRequestIds, namespaceId, repositoryId } = ev.properties;

  const { sourceControl, userId } = ev.metadata;


  const arrayOfExtractMergeRequestData = [];
  for (let i = 0; i < mergeRequestIds.length; i += 1) {
    arrayOfExtractMergeRequestData.push({
      mergeRequestId: mergeRequestIds[i]!,
      namespaceId,
      repositoryId,
    })
  }

  await insertEvent(
    { crawlId: ev.metadata.crawlId, eventNamespace: 'mergeRequestCommit', eventDetail: 'crawlInfo', data: { calls: mergeRequestIds.length } },
    { db: initDatabase(ev.metadata), entities: { events } }
  );

  await sender.sendAll(arrayOfExtractMergeRequestData, {
    crawlId: ev.metadata.crawlId,
    version: 1,
    caller: 'extract-merge-request-commits',
    sourceControl,
    userId,
    timestamp: new Date().getTime(),
    from: ev.metadata.from,
    to: ev.metadata.to,
    dbUrl: ev.metadata.dbUrl,
  })

});


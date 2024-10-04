import { mergeRequestNotes, mergeRequests, repositories, namespaces, MergeRequestSchema, NamespaceSchema, RepositorySchema, members, repositoriesToMembers } from "@dxta/extract-schema";
import { createMessageHandler } from "@stack/config/create-message";
import { MessageKind, metadataSchema } from "./messages";
import { z } from "zod";
import { getMergeRequestNotes, type Context, type GetMergeRequestNotesEntities, type GetMergeRequestNotesSourceControl } from "@dxta/extract-functions";
import { EventHandler } from "@stack/config/create-event";
import { extractMembersEvent, extractMergeRequestsEvent } from "./events";
import { insertEvent } from "@dxta/crawl-functions";
import { events } from "@dxta/crawl-schema";
import { filterNewExtractMembers } from "./filter-extract-members";
import { initDatabase, initSourceControl } from "./context";

type ExtractMergeRequestNotesContext = Context<GetMergeRequestNotesSourceControl, GetMergeRequestNotesEntities>;

const staticContext = {
  entities: {
    members,
    mergeRequestNotes,
    mergeRequests,
    namespaces,
    repositories,
    repositoriesToMembers,
  },
} satisfies Partial<ExtractMergeRequestNotesContext>;

export const mergeRequestNoteSenderHandler = createMessageHandler({
  queueId: 'ExtractQueue',
  kind: MessageKind.MergeRequestNote,
  metadataShape: metadataSchema.shape,
  contentShape: z.object({
    mergeRequestId: MergeRequestSchema.shape.id,
    repositoryId: RepositorySchema.shape.id,
    namespaceId: NamespaceSchema.shape.id,
  }).shape,
  handler: async (message) => {
    const { mergeRequestId, namespaceId, repositoryId } = message.content;

    const dynamicContext = {
      integrations: { sourceControl: await initSourceControl(message.metadata) },
      db: initDatabase(message.metadata),
    } satisfies Partial<ExtractMergeRequestNotesContext>;

    const { members } = await getMergeRequestNotes({
      mergeRequestId,
      repositoryId,
      namespaceId,
    }, { ...staticContext, ...dynamicContext });

    const memberIds = filterNewExtractMembers(members).map(member => member.id);
    if (memberIds.length === 0) return;

    await extractMembersEvent.publish({ memberIds }, {
      crawlId: message.metadata.crawlId,
      version: 1,
      caller: 'extract-merge-request-notes',
      sourceControl: message.metadata.sourceControl,
      userId: message.metadata.userId,
      timestamp: new Date().getTime(),
      from: message.metadata.from,
      to: message.metadata.to,
      dbUrl: message.metadata.dbUrl,
    });
  }
});

const { sender: mergeRequestNoteQueue } = mergeRequestNoteSenderHandler;

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
    { crawlId: ev.metadata.crawlId, eventNamespace: 'mergeRequestNote', eventDetail: 'crawlInfo', data: { calls: mergeRequestIds.length } },
    { db: initDatabase(ev.metadata), entities: { events } }
  );

  await mergeRequestNoteQueue.sendAll(arrayOfExtractMergeRequestData, {
    crawlId: ev.metadata.crawlId,
    version: 1,
    caller: 'extract-merge-request-notes',
    sourceControl,
    userId,
    timestamp: new Date().getTime(),
    from: ev.metadata.from,
    to: ev.metadata.to,
    dbUrl: ev.metadata.dbUrl,
  });
});

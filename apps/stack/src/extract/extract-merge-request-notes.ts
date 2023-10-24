import { mergeRequestNotes, mergeRequests, repositories, namespaces, MergeRequestSchema, NamespaceSchema, RepositorySchema, members } from "@acme/extract-schema";
import { createMessageHandler } from "@stack/config/create-message";
import { MessageKind, metadataSchema } from "./messages";
import { z } from "zod";
import { Config } from "sst/node/config";
import { createClient } from "@libsql/client";
import { GitHubSourceControl, GitlabSourceControl } from "@acme/source-control";
import { drizzle } from "drizzle-orm/libsql";
import { getMergeRequestNotes, type Context, type GetMergeRequestNotesEntities, type GetMergeRequestNotesSourceControl } from "@acme/extract-functions";
import { EventHandler } from "@stack/config/create-event";
import { extractMembersEvent, extractMergeRequestsEvent } from "./events";
import { getClerkUserToken } from "./get-clerk-user-token";
import { insertEvent } from "@acme/crawl-functions";
import { events } from "@acme/crawl-schema";


const client = createClient({ url: Config.EXTRACT_DATABASE_URL, authToken: Config.EXTRACT_DATABASE_AUTH_TOKEN });


const crawlClient = createClient({
  url: Config.CRAWL_DATABASE_URL,
  authToken: Config.CRAWL_DATABASE_AUTH_TOKEN
});

const crawlDb = drizzle(crawlClient);

const initSourceControl = async (userId: string, sourceControl: 'github' | 'gitlab') => {
  const accessToken = await getClerkUserToken(userId, `oauth_${sourceControl}`);
  if (sourceControl === 'github') return new GitHubSourceControl(accessToken);
  if (sourceControl === 'gitlab') return new GitlabSourceControl(accessToken);
  return null;
}

const db = drizzle(client);

const context: Context<GetMergeRequestNotesSourceControl, GetMergeRequestNotesEntities> = {
  db,
  entities: {
    members,
    mergeRequestNotes,
    mergeRequests,
    namespaces,
    repositories
  },
  integrations: {
    sourceControl: null
  }
};


export const mergeRequestNoteSenderHandler = createMessageHandler({
  kind: MessageKind.MergeRequestNote,
  metadataShape: metadataSchema.shape,
  contentShape: z.object({
    mergeRequestId: MergeRequestSchema.shape.id,
    repositoryId: RepositorySchema.shape.id,
    namespaceId: NamespaceSchema.shape.id,
  }).shape,
  handler: async (message) => {
    const { userId, sourceControl } = message.metadata;
    const { mergeRequestId, namespaceId, repositoryId } = message.content;
    context.integrations.sourceControl = await initSourceControl(userId, sourceControl);

    const { members } = await getMergeRequestNotes({
      mergeRequestId,
      repositoryId,
      namespaceId,
    }, context);

    await extractMembersEvent.publish({ memberIds: members.map(member => member.id) }, {
      crawlId: message.metadata.crawlId,
      version: 1,
      caller: 'extract-merge-request-notes',
      sourceControl,
      userId,
      timestamp: new Date().getTime(),
      from: message.metadata.from,
      to: message.metadata.to,
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

  await insertEvent({ crawlId: ev.metadata.crawlId, eventNamespace: 'mergeRequestNote', eventDetail: 'crawlInfo', data: {calls: mergeRequestIds.length }}, {db: crawlDb, entities: { events }})

  await mergeRequestNoteQueue.sendAll(arrayOfExtractMergeRequestData, {
    crawlId: ev.metadata.crawlId,
    version: 1,
    caller: 'extract-merge-request-notes',
    sourceControl,
    userId,
    timestamp: new Date().getTime(),
    from: ev.metadata.from,
    to: ev.metadata.to,
  });
});

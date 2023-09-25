import { mergeRequestNotes, mergeRequests, repositories, namespaces, MergeRequestSchema, NamespaceSchema, RepositorySchema } from "@acme/extract-schema";
import { createMessageHandler } from "@stack/config/create-message";
import { MessageKind, metadataSchema } from "./messages";
import { z } from "zod";
import { Config } from "sst/node/config";
import { createClient } from "@libsql/client";
import { GitHubSourceControl, GitlabSourceControl } from "@acme/source-control";
import { drizzle } from "drizzle-orm/libsql";
import { getMergeRequestNotes, type Context, type GetMergeRequestNotesEntities, type GetMergeRequestNotesSourceControl } from "@acme/extract-functions";
import { EventHandler } from "sst/node/event-bus";
import { extractMergeRequestsEvent } from "./events";
import { getClerkUserToken } from "./get-clerk-user-token";

const client = createClient({ url: Config.DATABASE_URL, authToken: Config.DATABASE_AUTH_TOKEN });

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

    await getMergeRequestNotes({
      mergeRequestId,
      repositoryId,
      namespaceId,
    }, context);
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
  await mergeRequestNoteQueue.sendAll(arrayOfExtractMergeRequestData, {
    version: 1,
    caller: 'extract-merge-request-diffs',
    sourceControl,
    userId,
    timestamp: new Date().getTime(),
    from: ev.metadata.from,
    to: ev.metadata.to,
  });

});

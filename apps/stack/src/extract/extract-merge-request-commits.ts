import { getMergeRequestCommits, type Context, type GetMergeRequestCommitsEntities, type GetMergeRequestCommitsSourceControl } from "@acme/extract-functions";
import { GitHubSourceControl, GitlabSourceControl } from "@acme/source-control";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { Config } from "sst/node/config";
import { mergeRequestCommits, namespaces, repositories, mergeRequests, RepositorySchema, NamespaceSchema, MergeRequestSchema } from "@acme/extract-schema";
import { EventHandler } from "@stack/config/create-event";
import { extractMergeRequestsEvent } from "./events";
import { createMessageHandler } from "@stack/config/create-message";
import { MessageKind, metadataSchema } from "./messages";
import { z } from "zod";
import { getClerkUserToken } from "./get-clerk-user-token";
import { insertEvent } from "@acme/crawl-functions";
import { events } from "@acme/crawl-schema";

export const mrcsh = createMessageHandler({
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

    context.integrations.sourceControl = await initSourceControl(message.metadata.userId, message.metadata.sourceControl);

    const { mergeRequestId, namespaceId, repositoryId } = message.content;

    await getMergeRequestCommits({
        mergeRequestId,
        namespaceId,
        repositoryId
      }, context)
  }
});

const { sender } = mrcsh;

  const client = createClient({
    url: Config.EXTRACT_DATABASE_URL,
    authToken: Config.EXTRACT_DATABASE_AUTH_TOKEN,
  });

  const crawlClient = createClient({
    url: Config.CRAWL_DATABASE_URL,
    authToken: Config.CRAWL_DATABASE_AUTH_TOKEN
  });
  
  const crawlDb = drizzle(crawlClient);
  const db = drizzle(client);

  const context: Context<
    GetMergeRequestCommitsSourceControl,
    GetMergeRequestCommitsEntities
  > = {
  entities: {
    mergeRequestCommits,
    namespaces,
    repositories,
    mergeRequests,
  },
  integrations: {
    sourceControl: null,
  },
  db,
};


const initSourceControl = async (userId: string, sourceControl: 'github' | 'gitlab') => {
  const accessToken = await getClerkUserToken(userId, `oauth_${sourceControl}`);
  if (sourceControl === 'github') return new GitHubSourceControl(accessToken);
  if (sourceControl === 'gitlab') return new GitlabSourceControl(accessToken);
  return null;
}

export const eventHandler = EventHandler(extractMergeRequestsEvent, async (evt) => {
  const { mergeRequestIds, namespaceId, repositoryId } = evt.properties;

  const { sourceControl, userId } = evt.metadata;


  const arrayOfExtractMergeRequestData = [];
  for (let i = 0; i < mergeRequestIds.length; i += 1) {
    arrayOfExtractMergeRequestData.push({
      mergeRequestId: mergeRequestIds[i]!,
      namespaceId,
      repositoryId,
    })
  }

  await insertEvent({ crawlId: evt.metadata.crawlId, eventNamespace: 'mergeRequestCommit', eventDetail: 'crawlInfo', data: {calls: mergeRequestIds.length }}, {db: crawlDb, entities: { events }})

  await sender.sendAll(arrayOfExtractMergeRequestData, {
    crawlId: evt.metadata.crawlId,
    version: 1,
    caller: 'extract-merge-request-commits',
    sourceControl,
    userId,
    timestamp: new Date().getTime(),
    from: evt.metadata.from,
    to: evt.metadata.to,
  })

});


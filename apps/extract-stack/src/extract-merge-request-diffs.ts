import { Clerk } from "@clerk/clerk-sdk-node";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { GitHubSourceControl, GitlabSourceControl } from "@acme/source-control";
import { Config } from "sst/node/config";
import type { Context, GetMergeRequestDiffsEntities, GetMergeRequestDiffsSourceControl } from "@acme/extract-functions";
import { getMergeRequestsDiffs } from "@acme/extract-functions";
import { mergeRequestDiffs, mergeRequests, repositories, namespaces, MergeRequestSchema, RepositorySchema, NamespaceSchema } from "@acme/extract-schema";
import { EventHandler } from "sst/node/event-bus";
import { extractMergeRequestsEvent } from "./events";
import { createMessageHandler } from "./create-message";
import { metadataSchema } from "./messages";
import { z } from "zod";

export const mergeRequestDiffSenderHandler = createMessageHandler({
  kind: 'merge-request-diff',
  metadataShape: metadataSchema.shape,
  contentShape: z.object({
    mergeRequestId: MergeRequestSchema.shape.id,
    repositoryId: RepositorySchema.shape.id,
    namespaceId: NamespaceSchema.shape.id,
  }).shape,
  handler: async (message) => {
    const { sourceControl, userId } = message.metadata;
    const { mergeRequestId, repositoryId, namespaceId } = message.content;
    context.integrations.sourceControl = await initSourceControl(userId, sourceControl);

    await getMergeRequestsDiffs({
      mergeRequestId,
      repositoryId,
      namespaceId
    }, context);
  }
});

const { sender } = mergeRequestDiffSenderHandler;


const clerkClient = Clerk({ secretKey: Config.CLERK_SECRET_KEY });
const client = createClient({ url: Config.DATABASE_URL, authToken: Config.DATABASE_AUTH_TOKEN });

const fetchSourceControlAccessToken = async (userId: string, forgeryIdProvider: 'oauth_github' | 'oauth_gitlab') => {
  const [userOauthAccessTokenPayload, ...rest] = await clerkClient.users.getUserOauthAccessToken(userId, forgeryIdProvider);
  if (!userOauthAccessTokenPayload) throw new Error("Failed to get token");
  if (rest.length !== 0) throw new Error("wtf ?");

  return userOauthAccessTokenPayload.token;
}

const initSourceControl = async (userId: string, sourceControl: 'github' | 'gitlab') => {
  const accessToken = await fetchSourceControlAccessToken(userId, `oauth_${sourceControl}`);
  if (sourceControl === 'github') return new GitHubSourceControl(accessToken);
  if (sourceControl === 'gitlab') return new GitlabSourceControl(accessToken);
  return null;
}

const db = drizzle(client);

const context: Context<GetMergeRequestDiffsSourceControl, GetMergeRequestDiffsEntities> = {
  db,
  entities: {
    mergeRequestDiffs,
    mergeRequests,
    namespaces,
    repositories
  },
  integrations: {
    sourceControl: null
  }
};

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

  await sender.sendAll(arrayOfExtractMergeRequestData, {
    version: 1,
    caller: 'extract-merge-request-diffs',
    sourceControl,
    userId,
    timestamp: new Date().getTime(),
  });

});

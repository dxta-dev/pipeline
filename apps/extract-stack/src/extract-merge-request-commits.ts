import { getMergeRequestCommits, type Context, type GetMergeRequestCommitsEntities, type GetMergeRequestCommitsSourceControl } from "@acme/extract-functions";
import { GitHubSourceControl, GitlabSourceControl } from "@acme/source-control";
import { Clerk } from "@clerk/clerk-sdk-node";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { Config } from "sst/node/config";
import { mergeRequestCommits, namespaces, repositories, mergeRequests, RepositorySchema, NamespaceSchema, MergeRequestSchema } from "@acme/extract-schema";
import { EventHandler } from "sst/node/event-bus";
import { extractMergeRequestsEvent } from "./events";
import { createMessageHandler } from "./create-message";
import { MessageKind, metadataSchema } from "./messages";
import { z } from "zod";

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

  const clerkClient = Clerk({ secretKey: Config.CLERK_SECRET_KEY });
  const client = createClient({
    url: Config.DATABASE_URL,
    authToken: Config.DATABASE_AUTH_TOKEN,
  });
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

const fetchSourceControlAccessToken = async (
  userId: string,
  forgeryIdProvider: "oauth_github" | "oauth_gitlab",
) => {
  const [userOauthAccessTokenPayload, ...rest] =
    await clerkClient.users.getUserOauthAccessToken(userId, forgeryIdProvider);
  if (!userOauthAccessTokenPayload) throw new Error("Failed to get token");
  if (rest.length !== 0) throw new Error("wtf ?");
  return userOauthAccessTokenPayload.token;
};

const initSourceControl = async (userId: string, sourceControl: 'github' | 'gitlab') => {
  const accessToken = await fetchSourceControlAccessToken(userId, `oauth_${sourceControl}`);
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

  await sender.sendAll(arrayOfExtractMergeRequestData, {
    version: 1,
    caller: 'extract-merge-request-commits',
    sourceControl,
    userId,
    timestamp: new Date().getTime(),
  })

});


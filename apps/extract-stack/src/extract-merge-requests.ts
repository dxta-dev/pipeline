import { Clerk } from "@clerk/clerk-sdk-node";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { Config } from "sst/node/config";
import { EventHandler } from "sst/node/event-bus";

import {
  getMergeRequests,
  getPaginationData,
  type Context,
  type GetMergeRequestsEntities,
  type GetMergeRequestsSourceControl,
} from "@acme/extract-functions";
import { mergeRequests } from "@acme/extract-schema";
import { GitHubSourceControl, GitlabSourceControl } from "@acme/source-control";

import { extractRepositoryEvent } from "./events";
import { extractMergeRequestMessage } from "./messages";
import { QueueHandler } from "./create-message";

const clerkClient = Clerk({ secretKey: Config.CLERK_SECRET_KEY });
const client = createClient({
  url: Config.DATABASE_URL,
  authToken: Config.DATABASE_AUTH_TOKEN,
});

const db = drizzle(client);

const context: Context<
  GetMergeRequestsSourceControl,
  GetMergeRequestsEntities
> = {
  entities: {
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

export const eventHandler = EventHandler(extractRepositoryEvent, async (evt) => {

  const externalRepositoryId = evt.properties.repository.externalId;
  const repositoryName = evt.properties.repository.name;
  const namespace = evt.properties.namespace;
  const repository = evt.properties.repository;
  const sourceControl = evt.metadata.sourceControl;
  const repositoryId = evt.properties.repository.id;

  context.integrations.sourceControl = await initSourceControl(evt.metadata.userId, sourceControl)

  const { paginationInfo } = await getPaginationData(
    {
      externalRepositoryId: externalRepositoryId,
      namespaceName: namespace?.name || "",
      repositoryName: repositoryName,
      repositoryId: repositoryId,
    },
    context,
  );

  for (let index = 1; index <= paginationInfo.totalPages; index++) {

    await extractMergeRequestMessage.send({
      repository,
      namespace,
      pagination: {
        page: index,
        perPage: paginationInfo.perPage,
        totalPages: paginationInfo.totalPages
      }
    }, { caller: 'extract-merge-requests', timestamp: new Date().getTime(), version: 1, sourceControl, userId: evt.metadata.userId });
  }
});

export const queueHandler = QueueHandler(extractMergeRequestMessage, async (message) => {
  
  if(!message){
    console.warn("Expected message to have content,but get empty")
    return;
  }

  context.integrations.sourceControl = await initSourceControl(message.metadata.userId, message.metadata.sourceControl);
  
  const {namespace, pagination, repository} = message.content;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars  
  const { mergeRequests } = await getMergeRequests(
    {
      externalRepositoryId: repository.externalId,
      namespaceName: namespace?.name || "",
      repositoryName: repository.name,
      repositoryId: repository.id,
      page: pagination.page,
      perPage: pagination.perPage,
    },
    context,
  );
})

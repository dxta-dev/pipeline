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

export const handler = EventHandler(extractRepositoryEvent, async (evt) => {
  let sourceControlAccessToken: string;

  const externalRepositoryId = evt.properties.repository.externalId;
  const repositoryName = evt.properties.repository.name;
  const namespaceName = evt.properties.namespace?.name;
  const sourceControl = evt.metadata.sourceControl;
  const repositoryId = evt.properties.repository.id;

  try {
    sourceControlAccessToken = await fetchSourceControlAccessToken(
      evt.metadata.userId,
      `oauth_${evt.metadata.sourceControl}`,
    );
  } catch (error) {
    console.log(error);

    return;
  }

  if (sourceControl === "gitlab") {
    context.integrations.sourceControl = new GitlabSourceControl(
      sourceControlAccessToken,
    );
  } else if (sourceControl === "github") {
    context.integrations.sourceControl = new GitHubSourceControl(
      sourceControlAccessToken,
    );
  }

  const { paginationInfo } = await getPaginationData(
    {
      externalRepositoryId: externalRepositoryId,
      namespaceName: namespaceName || "",
      repositoryName: repositoryName,
      repositoryId: repositoryId,
    },
    context,
  );

  const { mergeRequests } = await getMergeRequests(
    {
      externalRepositoryId: externalRepositoryId,
      namespaceName: namespaceName || "",
      repositoryName: repositoryName,
      repositoryId: repositoryId,
      page: paginationInfo.page,
      perPage: paginationInfo.perPage,
    },
    context,
  );

  console.log("PI", paginationInfo);
  console.log("MR", mergeRequests);
});

// import { EventHandler } from "sst/node/event-bus";

// const repositoryEvent = defineEvent(extractRepositoryEvent);
// console.log(repositoryEvent)

// export const handler = EventHandler(repositoryEvent, async (evt) => {
//   console.log("Todo created", evt);
// });

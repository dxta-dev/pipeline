import { Clerk } from "@clerk/clerk-sdk-node";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { Config } from "sst/node/config";

import {
  getMergeRequests,
  type Context,
  type GetMergeRequestsEntities,
  type GetMergeRequestsSourceControl,
} from "@acme/extract-functions";
import { mergeRequests } from "@acme/extract-schema";
import { GitHubSourceControl, GitlabSourceControl } from "@acme/source-control";

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

export async function handler(e, c) {
  let sourceControlAccessToken: string;

  const { sourceControl, repositoryId, repositoryName, namespaceName } = e;

  try {
    sourceControlAccessToken = await fetchSourceControlAccessToken(
      "user_2TVx14PlsjNKHdBBSa2OYbEMv0S",
      "oauth_gitlab",
    );
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: (error as Error).message }),
    };
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

  const { mergeRequests } = await getMergeRequests(
    {
      externalRepositoryId: repositoryId,
      namespaceName: namespaceName,
      repositoryName: repositoryName,
      repositoryId: repositoryId,
    },
    context,
  );
  return {};
}

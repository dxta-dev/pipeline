import { Clerk } from "@clerk/clerk-sdk-node";
import { createClient } from "@libsql/client";
import {
  GitHubSourceControl,
  GitlabSourceControl,
  githubErrorMod,
} from "@dxta/source-control";
import { drizzle } from "drizzle-orm/libsql";

import { getEnv } from "./env";

type SupportedClerkOAuthProviders = "oauth_github" | "oauth_gitlab";

let clerkClient: ReturnType<typeof Clerk> | null = null;

function getClerkClient() {
  if (!clerkClient) {
    clerkClient = Clerk({ secretKey: getEnv().CLERK_SECRET_KEY });
  }
  return clerkClient;
}

async function fetchClerkUserToken(
  userId: string,
  provider: SupportedClerkOAuthProviders,
) {
  const [userOauthAccessTokenPayload] = await getClerkClient().users.getUserOauthAccessToken(
    userId,
    provider,
  );

  if (!userOauthAccessTokenPayload) {
    throw new Error(`Failed to get token for ${userId} and ${provider}`);
  }

  return userOauthAccessTokenPayload.token;
}

export async function getClerkUserToken(
  userId: string,
  provider: SupportedClerkOAuthProviders,
) {
  return fetchClerkUserToken(userId, provider);
}

export function initDatabase(dbUrl: string) {
  return drizzle(
    createClient({
      url: dbUrl,
      authToken: getEnv().TENANT_DATABASE_AUTH_TOKEN,
    }),
  );
}

export function initSuperDatabase() {
  const env = getEnv();
  return drizzle(
    createClient({
      url: env.SUPER_DATABASE_URL,
      authToken: env.SUPER_DATABASE_AUTH_TOKEN,
    }),
  );
}

type InitSourceControlInput = {
  userId: string;
  sourceControl: "github" | "gitlab";
  options?: {
    fetchTimelineEventsPerPage?: number;
  };
};

export async function initSourceControl({
  userId,
  sourceControl,
  options,
}: InitSourceControlInput) {
  const accessToken = await getClerkUserToken(userId, `oauth_${sourceControl}`);

  if (sourceControl === "github") {
    const githubClient = new GitHubSourceControl({
      auth: accessToken,
      fetchTimelineEventsPerPage: options?.fetchTimelineEventsPerPage,
    });
    return githubErrorMod(githubClient);
  }

  if (sourceControl === "gitlab") {
    return new GitlabSourceControl(accessToken);
  }

  return null;
}

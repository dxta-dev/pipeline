import { Clerk } from "@clerk/clerk-sdk-node";
import { createClient } from "@libsql/client";
import {
  GitHubSourceControl,
  GitlabSourceControl,
  githubErrorMod,
} from "@dxta/source-control";
import { Redis } from "@upstash/redis";
import { drizzle } from "drizzle-orm/libsql";
import { nanoid } from "nanoid";

import { getEnv } from "./env";

type SupportedClerkOAuthProviders = "oauth_github" | "oauth_gitlab";

let clerkClient: ReturnType<typeof Clerk> | null = null;
let redisClient: Redis | null = null;

function getClerkClient() {
  if (!clerkClient) {
    clerkClient = Clerk({ secretKey: getEnv().CLERK_SECRET_KEY });
  }
  return clerkClient;
}

function getRedisClient() {
  if (!redisClient) {
    const env = getEnv();
    redisClient = new Redis({
      url: env.REDIS_URL,
      token: env.REDIS_TOKEN,
    });
  }
  return redisClient;
}

const encodeUserTokenCacheValue = (token: string) =>
  [token, nanoid()].join(" ");
const decodeUserTokenCacheValue = (value: string) =>
  value.split(" ") as [string, string];

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
  const userTokenCacheKey = `${userId}_${provider}`;
  let encodedUserTokenCacheValue: string | null;

  try {
    encodedUserTokenCacheValue =
      await getRedisClient().get<string>(userTokenCacheKey);
  } catch (error) {
    console.error("RedisClerkTokenCache: read error");
    console.error(error);
    encodedUserTokenCacheValue = null;
  }

  if (encodedUserTokenCacheValue !== null) {
    const [cachedToken] = decodeUserTokenCacheValue(encodedUserTokenCacheValue);
    return cachedToken;
  }

  const userToken = await fetchClerkUserToken(userId, provider);

  try {
    await getRedisClient().set<string>(
      userTokenCacheKey,
      encodeUserTokenCacheValue(userToken),
      { ex: getEnv().REDIS_USER_TOKEN_TTL },
    );
  } catch (error) {
    console.error("RedisClerkTokenCache: write error");
    console.error(error);
  }
  return userToken;
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

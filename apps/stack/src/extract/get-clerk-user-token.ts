import { Clerk } from "@clerk/clerk-sdk-node";
import { Redis } from "@upstash/redis";
import { nanoid } from "nanoid";
import { Config } from "sst/node/config";

type SupportedClerkOAuthProviders = 'oauth_github' | 'oauth_gitlab';

const clerkClient = Clerk({ secretKey: Config.CLERK_SECRET_KEY });
const redisClient = new Redis({
  url: Config.REDIS_URL,
  token: Config.REDIS_TOKEN,
});


const encodeUserTokenCacheValue = (token: string) => [token, nanoid()].join(' ');
const decodeUserTokenCacheValue = (value: string) => value.split(' ') as [string, string];

const fetchClerkUserToken = async (userId: string, provider: SupportedClerkOAuthProviders) => {
  const [userOauthAccessTokenPayload] = await clerkClient.users.getUserOauthAccessToken(userId, provider);

  if (!userOauthAccessTokenPayload) {
    throw new Error(`Failed to get token for ${userId} and ${provider}`);
  }

  return userOauthAccessTokenPayload.token;
};

export const overrideClerkUserToken = async (userId: string, provider:SupportedClerkOAuthProviders, userToken: string) => {
  const userTokenCacheKey = `${userId}_${provider}`;
  await redisClient.set<string>(userTokenCacheKey, encodeUserTokenCacheValue(userToken), { ex: Number(Config.REDIS_USER_TOKEN_TTL) });
}

export const getClerkUserToken = async (userId: string, provider: SupportedClerkOAuthProviders) => {
  const userTokenCacheKey = `${userId}_${provider}`;
  let encodedUserTokenCacheValue: string | null;

  try {
    encodedUserTokenCacheValue = await redisClient.get<string>(userTokenCacheKey);
  } catch (error) {
    console.error('RedisClerkTokenCache: read error');
    console.error(error);
    encodedUserTokenCacheValue = null;
  }

  if (encodedUserTokenCacheValue !== null) {
    const [cachedToken] = decodeUserTokenCacheValue(encodedUserTokenCacheValue);
    return cachedToken;
  }

  const userToken = await fetchClerkUserToken(userId, provider);

  try {
    await redisClient.set<string>(userTokenCacheKey, encodeUserTokenCacheValue(userToken), { ex: Number(Config.REDIS_USER_TOKEN_TTL) });
  } catch (error) {
    console.error('RedisClerkTokenCache: write error');
    console.error(error);    
  }
  return userToken;
}
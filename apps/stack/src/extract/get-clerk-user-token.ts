import { Clerk } from "@clerk/clerk-sdk-node";
import { Config } from "sst/node/config";

type SupportedClerkOAuthProviders = 'oauth_github' | 'oauth_gitlab';

const clerkClient = Clerk({ secretKey: Config.CLERK_SECRET_KEY });

// issue: never evicted so needs to be revised when have more than 100 unique tokens
// Use warm lambda to cache tokens in memory
const tokens = new Map<string, string>();
const expirations = new Map<string, number>();

const fetchClerkUserToken = async (userId: string, provider: SupportedClerkOAuthProviders) => {
  const [userOauthAccessTokenPayload] = await clerkClient.users.getUserOauthAccessToken(userId, provider);

  if (!userOauthAccessTokenPayload) {
    throw new Error(`Failed to get token for ${userId} and ${provider}`);
  }

  return userOauthAccessTokenPayload.token;
};

export const getClerkUserToken = async (userId: string, provider: SupportedClerkOAuthProviders, ts: number = Date.now()) => {
  const cacheKey = `${userId}_${provider}`;
  
  const exp = expirations.get(cacheKey);
  const cachedUserToken = tokens.get(cacheKey);
  const isCached = exp !== undefined && ts < exp;

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  if (isCached) return cachedUserToken!;
  
  const userToken = await fetchClerkUserToken(userId, provider);

  expirations.set(cacheKey, ts + Number(Config.REDIS_USER_TOKEN_TTL) * 1000)
  tokens.set(cacheKey, userToken);

  return userToken;
}
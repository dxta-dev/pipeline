import { Clerk } from "@clerk/clerk-sdk-node";
import { Config } from "sst/node/config";

type SupportedClerkOAuthProviders = 'oauth_github' | 'oauth_gitlab';

const clerkClient = Clerk({ secretKey: Config.CLERK_SECRET_KEY });

const fetchClerkUserToken = async (userId: string, provider: SupportedClerkOAuthProviders) => {
  const [userOauthAccessTokenPayload] = await clerkClient.users.getUserOauthAccessToken(userId, provider);

  if (!userOauthAccessTokenPayload) {
    throw new Error(`Failed to get token for ${userId} and ${provider}`);
  }

  return userOauthAccessTokenPayload.token;
};

export const getClerkUserToken = async (userId: string, provider: SupportedClerkOAuthProviders) => {

  const userToken = await fetchClerkUserToken(userId, provider);

  return userToken;
}
import { Clerk } from "@clerk/clerk-sdk-node";
import { Config } from "sst/node/config";

const clerkClient = Clerk({ secretKey: Config.CLERK_SECRET_KEY });

export const getClerkUserToken = async (userId: string, provider: 'oauth_github' | 'oauth_gitlab') => {
  const [userOauthAccessTokenPayload] = await clerkClient.users.getUserOauthAccessToken(userId, provider);

  if (!userOauthAccessTokenPayload) {
    throw new Error(`Failed to get token for ${userId} and ${provider}`);
  }

  return userOauthAccessTokenPayload.token;
}

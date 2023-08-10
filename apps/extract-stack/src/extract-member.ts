import { EventHandler } from "sst/node/event-bus";
import { extractRepositoryEvent } from "./events";
import { Clerk } from "@clerk/clerk-sdk-node";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { getMembers } from "@acme/extract-functions";
import type { Context, GetMembersEntities, GetMembersSourceControl } from "@acme/extract-functions";
import { members, repositoriesToMembers } from "@acme/extract-schema";
import { GitHubSourceControl, GitlabSourceControl } from "@acme/source-control";
import { Config } from "sst/node/config";

const clerkClient = Clerk({ secretKey: Config.CLERK_SECRET_KEY });
const client = createClient({ url: Config.DATABASE_URL, authToken: Config.DATABASE_AUTH_TOKEN });

const fetchSourceControlAccessToken = async (userId: string, forgeryIdProvider: 'oauth_github' | 'oauth_gitlab') => {
  const [userOauthAccessTokenPayload, ...rest] = await clerkClient.users.getUserOauthAccessToken(userId, forgeryIdProvider);
  if (!userOauthAccessTokenPayload) throw new Error("Failed to get token");
  if (rest.length !== 0) throw new Error("wtf ?");

  return userOauthAccessTokenPayload.token;
}

const db = drizzle(client);

const context: Context<GetMembersSourceControl, GetMembersEntities> = {
  entities: {
    members,
    repositoriesToMembers
  },
  integrations: {
    sourceControl: null,
  },
  db,
};


export const busHandler = EventHandler(extractRepositoryEvent, async (ev) => {
  const { namespace, repository } = ev.properties;
  const { sourceControl, userId } = ev.metadata;

  let sourceControlAccessToken: string;
  try {
    sourceControlAccessToken = await fetchSourceControlAccessToken(userId, `oauth_${sourceControl}`);
  } catch (error) {
    console.error(error);
    return;
  }

  if (sourceControl === 'github') {
    context.integrations.sourceControl = new GitHubSourceControl(sourceControlAccessToken);
  } else if (sourceControl === 'gitlab') {
    context.integrations.sourceControl = new GitlabSourceControl(sourceControlAccessToken);
  }

  const { members, paginationInfo } = await getMembers({
    externalRepositoryId: repository.externalId,
    namespaceName: namespace?.name || "",
    repositoryId: repository.id,
    repositoryName: repository.name,
    perPage: 2,
    page: 1
  }, context);

  console.log('publishing', { members, paginationInfo });

});
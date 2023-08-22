import { getMergeRequestCommits, type Context, type GetMergeRequestCommitsEntities, type GetMergeRequestCommitsSourceControl } from "@acme/extract-functions";
import { GitHubSourceControl, GitlabSourceControl } from "@acme/source-control";
import { Clerk } from "@clerk/clerk-sdk-node";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { Config } from "sst/node/config";
import { mergeRequestCommits, namespaces, repositories } from "@acme/extract-schema";
import { EventHandler } from "sst/node/event-bus";
import { extractRepositoryEvent } from "./events";
import { eq } from "drizzle-orm";

const clerkClient = Clerk({ secretKey: Config.CLERK_SECRET_KEY });
const client = createClient({
  url: Config.DATABASE_URL,
  authToken: Config.DATABASE_AUTH_TOKEN,
});
const db = drizzle(client);

const context: Context<
  GetMergeRequestCommitsSourceControl,
  GetMergeRequestCommitsEntities
> = {
  entities: {
    mergeRequestCommits,
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
  if (!evt.properties.namespaceId) throw new Error("Missing namespaceId");

  console.log('EVT', evt);

  const repository = await db.select().from(repositories).where(eq(repositories.id, evt.properties.repositoryId)).get();
  const namespace = await db.select().from(namespaces).where(eq(namespaces.id, evt.properties.namespaceId)).get();

  if (!repository) throw new Error("invalid repo id");
  if (!namespace) throw new Error("Invalid namespace id");

  const sourceControl = evt.metadata.sourceControl;

  context.integrations.sourceControl = await initSourceControl(evt.metadata.userId, sourceControl)

  const { mergeRequestCommits} = await getMergeRequestCommits({
    externalRepositoryId: repository.externalId,
    namespaceName: namespace?.name,
    repositoryName: repository.name,
    mergerequestIId: 4,
  }, context);

  console.log('MRC', mergeRequestCommits);
});
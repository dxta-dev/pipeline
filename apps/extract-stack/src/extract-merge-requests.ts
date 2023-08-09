import { Clerk } from "@clerk/clerk-sdk-node";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { ApiHandler, useJsonBody } from "sst/node/api";
import { Config } from "sst/node/config";
import { z } from "zod";

import {
  getMergeRequests,
  type Context,
  type GetMergeRequestsEntities,
  type GetMergeRequestsSourceControl,
} from "@acme/extract-functions";
import { mergeRequests } from "@acme/extract-schema";
import { GitHubSourceControl, GitlabSourceControl } from "@acme/source-control";

import { defineEvent, extractMergeRequestsEvent } from "./events";

const clerkClient = Clerk({ secretKey: Config.CLERK_SECRET_KEY });
const client = createClient({
  url: Config.DATABASE_URL,
  authToken: Config.DATABASE_AUTH_TOKEN,
});

const db = drizzle(client);

const event = defineEvent(extractMergeRequestsEvent);

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

const contextSchema = z.object({
  authorizer: z.object({
    jwt: z.object({
      claims: z.object({
        sub: z.string(),
      }),
    }),
  }),
});

type CTX = z.infer<typeof contextSchema>;

const inputSchema = z.object({
  repositoryId: z.number(),
  repositoryName: z.string(),
  namespaceName: z.string(),
  sourceControl: z.literal("gitlab").or(z.literal("github")),
});

type Input = z.infer<typeof inputSchema>;

export const handler = ApiHandler(async (ev) => {
  const body = useJsonBody() as unknown;

  let lambdaContext: CTX;

  try {
    lambdaContext = contextSchema.parse(ev.requestContext);
  } catch (error) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }

  let input: Input;
  let sourceControlAccessToken: string;

  try {
    input = inputSchema.parse(body);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }

  const { sub } = lambdaContext.authorizer.jwt.claims;

  const { repositoryId, repositoryName, namespaceName, sourceControl } = input;

  try {
    sourceControlAccessToken = await fetchSourceControlAccessToken(
      sub,
      `oauth_${sourceControl}`,
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
      repositoryName,
      namespaceName,
      repositoryId,
    },
    context,
  );

  await event.publish(
    { mergeRequests },
    {
      caller: "extract-merge-request",
      timestamp: new Date().getTime(),
      version: 1,
      sourceControl,
      userId: sub,
    },
  );

  return {
    statusCode: 200,
    body: JSON.stringify({}),
  };
});

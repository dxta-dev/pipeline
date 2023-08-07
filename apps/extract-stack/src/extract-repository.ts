import { extractRepositoryEvent, defineEvent } from "./events";
import { getRepository } from "@acme/extract-functions";
import type { Context, GetRepositorySourceControl, GetRepositoryEntities } from "@acme/extract-functions";
import { GitlabSourceControl } from "@acme/source-control";
import { repositories, namespaces } from "@acme/extract-schema";
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { z } from "zod";
import { Config } from "sst/node/config";

import { Clerk } from "@clerk/clerk-sdk-node";

const clerkClient = Clerk({ secretKey: Config.CLERK_SECRET_KEY });
const client = createClient({ url: Config.DATABASE_URL, authToken: Config.DATABASE_AUTH_TOKEN });

const db = drizzle(client);

const event = defineEvent(extractRepositoryEvent);

const fetchGitForgeryAccessToken = async (userId: string, forgeryIdProvider: 'oauth_github' | 'oauth_gitlab') => {
  const [userOauthAccessTokenPayload, ...rest] = await clerkClient.users.getUserOauthAccessToken(userId, forgeryIdProvider);
  if (!userOauthAccessTokenPayload) throw new Error("Failed to get token");
  if (rest.length !== 0) throw new Error("wtf ?");

  return userOauthAccessTokenPayload.token;
}

const context: Context<GetRepositorySourceControl, GetRepositoryEntities> = {
  entities: {
    repositories,
    namespaces,
  },
  integrations: {
    sourceControl: new GitlabSourceControl(""),
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
});

type Input = z.infer<typeof inputSchema>;

export const handler: APIGatewayProxyHandlerV2 = async (ev, ctx) => {

  let lambdaContext: CTX; 

  try {
    lambdaContext = contextSchema.parse(ctx);
  } catch (error) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }

  let input: Input;
  let gitForgeryAccessToken: string;

  try {
    input = inputSchema.parse(ev);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
  try {
    gitForgeryAccessToken = await fetchGitForgeryAccessToken('', 'oauth_gitlab');
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: (error as Error).message }),
    }
  }

  const { sub } = lambdaContext.authorizer.jwt.claims;

  const { repositoryId, repositoryName, namespaceName } = input;
  const context: Context<GetRepositorySourceControl, GetRepositoryEntities> = {
    entities: {
      repositories,
      namespaces,
    },
    integrations: {
      sourceControl: new GitlabSourceControl(gitForgeryAccessToken)
    },
    db,
  }

  const { repository, namespace } = await getRepository({ externalRepositoryId: repositoryId, repositoryName, namespaceName }, context);

  await event.publish({ repository, namespace }, { caller: 'extract-repository', timestamp: new Date().getTime(), version: 1 });

  return {
    statusCode: 200,
    body: JSON.stringify({})
  };
}

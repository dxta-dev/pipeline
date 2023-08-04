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
import type { OAuthProvider } from "@clerk/clerk-sdk-node";

const clerkClient = Clerk({secretKey: Config.CLERK_SECRET_KEY});
const client = createClient({ url: Config.DATABASE_URL, authToken: Config.DATABASE_AUTH_TOKEN });

const db = drizzle(client);

const event = defineEvent(extractRepositoryEvent);


const initContext = async (userId: string, provider: `oauth_${OAuthProvider}`): Promise<Context<GetRepositorySourceControl, GetRepositoryEntities>> => {
  const [userOauthAccessTokenPayload, ...rest] = await clerkClient.users.getUserOauthAccessToken(userId, provider);

  if (!userOauthAccessTokenPayload) throw new Error("Failed to get token");
  if (rest.length !== 0) throw new Error("wtf ?");

  return {
    entities: {
      repositories,
      namespaces,
    },
    integrations: {
      sourceControl: new GitlabSourceControl(userOauthAccessTokenPayload.token),
    },
    db,

  }
}
const lazyContext = initContext('user_2TVwyW6xEViigMUomoCx96I4rQb', 'oauth_gitlab');

const inputSchema = z.object({
  repositoryId: z.number(),
  repositoryName: z.string(),
  namespaceName: z.string(),
});

type Input = z.infer<typeof inputSchema>;

export const handler: APIGatewayProxyHandlerV2 = async (apiGatewayEvent) => {
  let input: Input;
  let context: Context<GetRepositorySourceControl, GetRepositoryEntities>;

  try {
    input = inputSchema.parse(apiGatewayEvent);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
  try {
    context = await lazyContext;
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: (error as Error).message }),
    }
  }

  const { repositoryId, repositoryName, namespaceName } = input;

  const { repository, namespace } = await getRepository({ externalRepositoryId: repositoryId, repositoryName, namespaceName }, context);

  await event.publish({ repository, namespace }, { caller: 'extract-repository', timestamp: new Date().getTime(), version: 1 });

  return {
    statusCode: 200,
    body: JSON.stringify({})
  };
}

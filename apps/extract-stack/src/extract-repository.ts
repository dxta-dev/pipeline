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

const configSchema = z.object({
  DATABASE_URL: z.string(),
  DATABASE_AUTH_TOKEN: z.string(),
  GITLAB_TOKEN: z.string(),
});

const config = configSchema.parse(Config);

const client = createClient({ url: config.DATABASE_URL, authToken: config.DATABASE_AUTH_TOKEN });

const db = drizzle(client);

const event = defineEvent(extractRepositoryEvent);


const context: Context<GetRepositorySourceControl, GetRepositoryEntities> = {
  entities: {
    repositories,
    namespaces,
  },
  integrations: {
    sourceControl: new GitlabSourceControl(config.GITLAB_TOKEN),
  },
  db,
};

const inputSchema = z.object({
  repositoryId: z.number(),
  repositoryName: z.string(),
  namespaceName: z.string(),
});

type Input = z.infer<typeof inputSchema>;

export const handler: APIGatewayProxyHandlerV2 = async (apiGatewayEvent) => {

  let input: Input;

  console.log(apiGatewayEvent);

  try {
    input = inputSchema.parse(apiGatewayEvent);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }

  const { repositoryId, repositoryName, namespaceName } = input;

  const { repository, namespace } = await getRepository({ externalRepositoryId: repositoryId, repositoryName, namespaceName }, context);

  await event.publish({ repository, namespace }, { caller: 'extract-repository', timestamp: new Date().getTime(), version: 1 });

  return {
    statusCode: 200,
    body: JSON.stringify({})
  };
}

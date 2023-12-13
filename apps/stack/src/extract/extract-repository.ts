import { extractRepositoryEvent } from "./events";
import { getRepository } from "@acme/extract-functions";
import type { Context, GetRepositorySourceControl, GetRepositoryEntities } from "@acme/extract-functions";
import { GitlabSourceControl, GitHubSourceControl } from "@acme/source-control";
import { repositories, namespaces } from "@acme/extract-schema";
import { instances } from "@acme/crawl-schema";
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { z } from "zod";
import { Config } from "sst/node/config";
import { ApiHandler, useJsonBody } from 'sst/node/api';
import { getClerkUserToken } from "./get-clerk-user-token";
import { setInstance } from "@acme/crawl-functions";

const client = createClient({
  url: Config.EXTRACT_DATABASE_URL,
  authToken: Config.EXTRACT_DATABASE_AUTH_TOKEN
});

const crawlClient = createClient({
  url: Config.CRAWL_DATABASE_URL,
  authToken: Config.CRAWL_DATABASE_AUTH_TOKEN
});

const db = drizzle(client);

const crawlDb = drizzle(crawlClient);

const context: Context<GetRepositorySourceControl, GetRepositoryEntities> = {
  entities: {
    repositories,
    namespaces,
  },
  integrations: {
    sourceControl: null,
  },
  db,
};

const inputSchema = z.object({
  repositoryId: z.number(),
  repositoryName: z.string(),
  namespaceName: z.string(),
  sourceControl: z.literal("gitlab").or(z.literal("github")),
  from: z.coerce.date(),
  to: z.coerce.date()
});

type Input = z.infer<typeof inputSchema>;
const extractRepository = async (input: Input, userId: string) => {
  const { repositoryId, repositoryName, namespaceName, sourceControl, from, to } = input;

  const sourceControlAccessToken = await getClerkUserToken(userId, `oauth_${sourceControl}`);

  if (sourceControl === "gitlab") {
    context.integrations.sourceControl = new GitlabSourceControl(sourceControlAccessToken);
  } else if (sourceControl === "github") {
    context.integrations.sourceControl = new GitHubSourceControl(sourceControlAccessToken);
  }

  const { repository, namespace } = await getRepository({ externalRepositoryId: repositoryId, repositoryName, namespaceName }, context);

  const { instanceId } = await setInstance({ repositoryId: repository.id, userId }, { db: crawlDb, entities: { instances } });

  await extractRepositoryEvent.publish(
    {
      repositoryId: repository.id,
      namespaceId: namespace.id
    },
    {
      crawlId: instanceId,
      caller: 'extract-repository',
      timestamp: new Date().getTime(),
      version: 1,
      sourceControl,
      userId,
      from,
      to,
    }
  );

}

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

  try {
    input = inputSchema.parse(body);

  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }

  const { sub } = lambdaContext.authorizer.jwt.claims;

try {
  await extractRepository(input, sub);
} catch (error) {
  return {
    statusCode: 500,
    body: JSON.stringify({ error: (error as Error).toString() })
  }
}

  return {
    statusCode: 200,
    body: JSON.stringify({})
  };
});

const CRON_ENV = z.object({
  CRON_USER_ID: z.string(),
  PUBLIC_REPO_NAME: z.string(),
  PUBLIC_REPO_OWNER: z.string(),
})
export const cronHandler = async ()=> {

    const validEnv = CRON_ENV.safeParse(process.env);

    if (!validEnv.success) {
      console.error("Invalid environment in lambda 'extract-repository.cronHandler':", ...validEnv.error.issues);
      throw new Error("Invalid environment");
    }

    const { CRON_USER_ID, PUBLIC_REPO_NAME, PUBLIC_REPO_OWNER } = validEnv.data;

    const utcTodayAt10AM = new Date();
    utcTodayAt10AM.setUTCHours(10, 0, 0, 0);
    const utcYesterdayAt10AM = new Date(utcTodayAt10AM);
    utcYesterdayAt10AM.setHours(utcTodayAt10AM.getUTCHours() - 24);

    await extractRepository({
      namespaceName: PUBLIC_REPO_OWNER,
      repositoryId: 0,
      repositoryName: PUBLIC_REPO_NAME,
      sourceControl: 'github',
      from: utcYesterdayAt10AM,
      to: utcTodayAt10AM,
    }, CRON_USER_ID);
  
}

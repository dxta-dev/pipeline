import { extractRepositoryEvent } from "./events";
import { getRepository } from "@acme/extract-functions";
import type { Context, GetRepositorySourceControl, GetRepositoryEntities } from "@acme/extract-functions";
import { GitHubSourceControl } from "@acme/source-control";
import { repositories, namespaces } from "@acme/extract-schema";
import { instances } from "@acme/crawl-schema";
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { Config } from "sst/node/config";
import { overrideClerkUserToken } from "./get-clerk-user-token";
import { setInstance } from "@acme/crawl-functions";

import { PUBLIC_REPOS } from "@acme/public-repos"

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
    sourceControl: new GitHubSourceControl(Config.SYSTEM_GITHUB_TOKEN),
  },
  db,
};

const sub = "__system";
export const handler = async () => {
  
  if (Config.SYSTEM_GITHUB_TOKEN === "__disabled") {
    console.log("System token is '__disabled', skipping periodic extract...");
    return;
  }

  const githubRepos = PUBLIC_REPOS.filter(repo => repo.forgeType === 'github');

  // ISSUES: need longer override cache
  await overrideClerkUserToken(sub, 'oauth_github', Config.SYSTEM_GITHUB_TOKEN);

  // CONSIDER: config for what time ? what about period
  const utcTodayAt10AM = new Date();
  utcTodayAt10AM.setUTCHours(10, 0, 0, 0);
  const utcYesterdayAt10AM = new Date(utcTodayAt10AM);
  utcYesterdayAt10AM.setHours(utcTodayAt10AM.getUTCHours() - 24);

  for (const repo of githubRepos) {
    const { namespace, repository } = await getRepository({ externalRepositoryId: 0, repositoryName: repo.name, namespaceName: repo.owner }, context);
    const { instanceId } = await setInstance({ repositoryId: repository.id, userId: sub }, { db: crawlDb, entities: { instances } });

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
        sourceControl: 'github',
        userId: sub,
        from: utcYesterdayAt10AM,
        to: utcTodayAt10AM,
      }
    );
  
  }

}
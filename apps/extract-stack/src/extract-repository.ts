import { extractRepositoryEvent, defineEvent } from "./events";
import { getRepository } from "@acme/extract-functions";
import type { Context, GetRepositorySourceControl, GetRepositoryEntities } from "@acme/extract-functions";
import { GitlabSourceControl } from "@acme/source-control";
import { repositories, namespaces } from "@acme/extract-schema";
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

const client = createClient({ url: 'DATABASE_URL', authToken: 'DATABASE_AUTH_TOKEN' });

const db = drizzle(client);

const event = defineEvent(extractRepositoryEvent);


const context: Context<GetRepositorySourceControl, GetRepositoryEntities> = {
  entities: {
    repositories,
    namespaces,
  },
  integrations: {
    sourceControl: new GitlabSourceControl('aaa'),
  },
  db,
};


export async function handler() {

  const { repository, namespace } = await getRepository({ externalRepositoryId: 1, repositoryName: 'bar', namespaceName: 'foo' }, context);

  await event.publish({ repository: { ...repository, id: 1 }, namespace: { ...namespace, id: 1 } }, { caller: 'extract-repository', timestamp: new Date().getTime(), version: 1 });

}

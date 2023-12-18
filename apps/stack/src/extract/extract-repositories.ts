import { getRepository, type Context, type GetRepositoryEntities, type GetRepositoryInput, type GetRepositorySourceControl } from "@acme/extract-functions";
import { NamespaceSchema, RepositorySchema, namespaces, repositories } from "@acme/extract-schema";
import { createClient } from "@libsql/client";
import { resolveTenantDb, type OmitDb, type Tenancy, TenantSchema } from "@stack/config/tenant-db";
import { drizzle } from "drizzle-orm/libsql";
import { Config } from "sst/node/config";
import { z } from "zod";
import { getClerkUserToken } from "./get-clerk-user-token";
import { GitHubSourceControl, GitlabSourceControl } from "@acme/source-control";
import { instances } from "@acme/crawl-schema";
import { setInstance } from "@acme/crawl-functions";
import { extractRepositoryEvent } from "./events";
import { createMessageHandler } from "@stack/config/create-message";
import { MessageKind, metadataSchema } from "./messages";
import { eq } from "drizzle-orm";

type SourceControlOption = 'github' | 'gitlab';

const extractRepository = async (repositoryInput: GetRepositoryInput, sourceControl: SourceControlOption, from: Date, to: Date, userId: string, tenantId: Tenancy['id']) => {

  const { externalRepositoryId, repositoryName, namespaceName } = repositoryInput;

  const sourceControlAccessToken = await getClerkUserToken(userId, `oauth_${sourceControl}`);

  if (sourceControl === "gitlab") {
    context.integrations.sourceControl = new GitlabSourceControl(sourceControlAccessToken);
  } else if (sourceControl === "github") {
    context.integrations.sourceControl = new GitHubSourceControl(sourceControlAccessToken);
  }

  const db = resolveTenantDb(tenantId);
  const { repository, namespace } = await getRepository({ externalRepositoryId, repositoryName, namespaceName }, { ...context, db });

  const { instanceId } = await setInstance({ repositoryId: repository.id, userId }, { db, entities: { instances } });

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
      // tenantId,
      from,
      to,
    }
  );

}

export const repositoriesSenderHandler = createMessageHandler({
  queueId: 'ExtractQueue',
  kind: MessageKind.Repository,
  metadataShape: metadataSchema.shape,
  contentShape: z.object({
    externalRepositoryId: RepositorySchema.shape.externalId,
    repositoryName: RepositorySchema.shape.name,
    namespaceName: NamespaceSchema.shape.name,
    tenantId: TenantSchema.shape.id, // TODO: move to metadata
  }).shape,
  handler: async (message) => {
    await extractRepository({
      externalRepositoryId: message.content.externalRepositoryId,
      namespaceName: message.content.namespaceName,
      repositoryName: message.content.repositoryName,
    },
      message.metadata.sourceControl,
      message.metadata.from,
      message.metadata.to,
      message.metadata.userId,
      message.content.tenantId
    );
  }
});
const {sender} = repositoriesSenderHandler;

const client = createClient({ url: Config.TENANT_DATABASE_URL, authToken: Config.TENANT_DATABASE_AUTH_TOKEN });

const db = drizzle(client);

const context: OmitDb<Context<GetRepositorySourceControl, GetRepositoryEntities>> = {
  entities: {
    repositories,
    namespaces,
  },
  integrations: {
    sourceControl: null,
  },
};

const CRON_ENV = z.object({
  CRON_USER_ID: z.string(),
  TENANT_ID: z.string(),
});
export const cronHandler = async ()=> {
  const validEnv = CRON_ENV.safeParse(process.env);

  if (!validEnv.success) {
    console.error("Invalid environment in lambda 'extract-repositories.cronHandler':", ...validEnv.error.issues);
    throw new Error("Invalid environment");
  }
  const { CRON_USER_ID, TENANT_ID} = validEnv.data;

  const utcTodayAt10AM = new Date();
  utcTodayAt10AM.setUTCHours(10, 0, 0, 0);
  const utcYesterdayAt10AM = new Date(utcTodayAt10AM);
  utcYesterdayAt10AM.setHours(utcTodayAt10AM.getUTCHours() - 24);

  const repositories = await db.select({ 
    repositoryName: context.entities.repositories.name,
    externalRepositoryId: context.entities.repositories.externalId,
    namespaceName: context.entities.namespaces.name,
    forgeType: context.entities.repositories.forgeType,
   })
   .from(context.entities.repositories)
   .leftJoin(context.entities.namespaces, eq(context.entities.repositories.namespaceId, context.entities.namespaces.id))
   .all();

   const githubRepos = repositories.filter(repo=>repo.forgeType === 'github').map(repo=>({
    repositoryName: repo.repositoryName,
    externalRepositoryId: repo.externalRepositoryId,
    namespaceName: repo.namespaceName!, // TODO: what if foreign key constraint broken ?
    tenantId: Number(TENANT_ID),
   }));

   if (githubRepos.length > 0) {
    await sender.sendAll(githubRepos, {
      version: 1,
      caller: 'extract-repositories',
      sourceControl: 'github',
      userId: CRON_USER_ID,
      timestamp: new Date().getTime(),
      from: utcYesterdayAt10AM,
      to: utcTodayAt10AM,
      crawlId: -1, // TODO: what does this mean ? -> crawl starts at extract-repository, but we still need the queue here ?
     });
   }

   const gitlabRepos = repositories.filter(repo=>repo.forgeType === 'gitlab').map(repo=>({
    repositoryName: repo.repositoryName,
    externalRepositoryId: repo.externalRepositoryId,
    namespaceName: repo.namespaceName!,
    tenantId: Number(TENANT_ID),
   }));

   if (gitlabRepos.length > 0) {
    await sender.sendAll(gitlabRepos, {
      version: 1,
      caller: 'extract-repositories',
      sourceControl: 'github',
      userId: CRON_USER_ID,
      timestamp: new Date().getTime(),
      from: utcYesterdayAt10AM,
      to: utcTodayAt10AM,
      crawlId: -1,
    });
   }

}
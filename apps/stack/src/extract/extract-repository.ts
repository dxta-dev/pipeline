import { extractRepositoryEvent } from "./events";
import { getRepository } from "@acme/extract-functions";
import type { Context, GetRepositorySourceControl, GetRepositoryEntities } from "@acme/extract-functions";
import { GitlabSourceControl, GitHubSourceControl } from "@acme/source-control";
import { repositories, namespaces, RepositorySchema, NamespaceSchema } from "@acme/extract-schema";
import { instances } from "@acme/crawl-schema";
import { z } from "zod";
import { getClerkUserToken } from "./get-clerk-user-token";
import { setInstance } from "@acme/crawl-functions";
import { getTenantDb, type OmitDb } from "@stack/config/get-tenant-db";
import { MessageKind, metadataSchema } from "./messages";
import { createMessageHandler } from "@stack/config/create-message";

const context: OmitDb<Context<GetRepositorySourceControl, GetRepositoryEntities>> = {
  entities: {
    repositories,
    namespaces,
  },
  integrations: {
    sourceControl: null,
  },
};

const inputSchema = z.object({
  repositoryId: z.number(),
  repositoryName: z.string(),
  namespaceName: z.string(),
  sourceControl: z.literal("gitlab").or(z.literal("github")),
  from: z.coerce.date(),
  to: z.coerce.date(),
  tenantId: z.number(),
});

type Input = z.infer<typeof inputSchema>;
const extractRepository = async (input: Input, userId: string) => {
  const { tenantId, repositoryId, repositoryName, namespaceName, sourceControl, from, to } = input;
  const db = getTenantDb(tenantId);

  const sourceControlAccessToken = await getClerkUserToken(userId, `oauth_${sourceControl}`);

  if (sourceControl === "gitlab") {
    context.integrations.sourceControl = new GitlabSourceControl(sourceControlAccessToken);
  } else if (sourceControl === "github") {
    if (sourceControl === 'github') 
    context.integrations.sourceControl = new GitHubSourceControl({ auth: sourceControlAccessToken });
  }

  const { repository, namespace } = await getRepository({ externalRepositoryId: repositoryId, repositoryName, namespaceName }, { ...context, db });

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
      from,
      to,
      tenantId,
    }
  );

}

export const repositorySenderHandler = createMessageHandler({
  queueId: 'ExtractQueue',
  kind: MessageKind.Repository,
  metadataShape: metadataSchema.omit({ sourceControl: true, crawlId: true }).shape,
  contentShape: z.object({
    externalRepositoryId: RepositorySchema.shape.externalId,
    forgeType: RepositorySchema.shape.forgeType,
    repositoryName: RepositorySchema.shape.name,
    namespaceName: NamespaceSchema.shape.name,
  }).shape,
  handler: async (message) => {
    await extractRepository({
      repositoryId: message.content.externalRepositoryId,
      namespaceName: message.content.namespaceName,
      repositoryName: message.content.repositoryName,
      from:message.metadata.from,
      to:message.metadata.to,
      sourceControl: message.content.forgeType,
      tenantId: message.metadata.tenantId,
    }, message.metadata.userId);
  }
});

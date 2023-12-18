import { EventHandler } from "@stack/config/create-event";
import { extractMembersEvent, extractRepositoryEvent } from "./events";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { getMembers } from "@acme/extract-functions";
import type { Context, GetMembersEntities, GetMembersSourceControl } from "@acme/extract-functions";
import { members, namespaces, repositories, repositoriesToMembers, NamespaceSchema, RepositorySchema } from "@acme/extract-schema";
import type { Namespace, Repository } from "@acme/extract-schema";
import { GitHubSourceControl, GitlabSourceControl } from "@acme/source-control";
import type { Pagination } from "@acme/source-control";
import { Config } from "sst/node/config";

import { createMessageHandler } from "@stack/config/create-message";
import { eq } from "drizzle-orm";
import { metadataSchema, paginationSchema, MessageKind } from "./messages";
import { z } from 'zod';
import { getClerkUserToken } from "./get-clerk-user-token";
import { insertEvent } from "@acme/crawl-functions";
import { events } from "@acme/crawl-schema";

export const memberSenderHandler = createMessageHandler({
  queueId: 'ExtractQueue',
  kind: MessageKind.Member,
  metadataShape: metadataSchema.shape,
  contentShape: z.object({
    repository: RepositorySchema,
    namespace: NamespaceSchema,
    pagination: paginationSchema,
  }).shape,
  handler: async (message) => {
    await extractMembersPage({
      crawlId: message.metadata.crawlId,
      namespace: message.content.namespace,
      paginationInput: message.content.pagination,
      repository: message.content.repository,
      sourceControl: message.metadata.sourceControl,
      userId: message.metadata.userId,
      from: message.metadata.from,
      to: message.metadata.to
    });
  }
});

const { sender } = memberSenderHandler;

const client = createClient({ url: Config.TENANT_DATABASE_URL, authToken: Config.TENANT_DATABASE_AUTH_TOKEN });

const initSourceControl = async (userId: string, sourceControl: 'github' | 'gitlab') => {
  const accessToken = await getClerkUserToken(userId, `oauth_${sourceControl}`);
  if (sourceControl === 'github') return new GitHubSourceControl(accessToken);
  if (sourceControl === 'gitlab') return new GitlabSourceControl(accessToken);
  return null;
}

const db = drizzle(client);

const context: Context<GetMembersSourceControl, GetMembersEntities> = {
  entities: {
    members,
    repositoriesToMembers
  },
  integrations: {
    sourceControl: null,
  },
  db,
};

type ExtractMembersPageInput = {
  namespace: Namespace;
  repository: Repository;
  sourceControl: "github" | "gitlab";
  userId: string;
  paginationInput: Pick<Pagination, "page" | "perPage">;
  from: Date;
  to: Date;
  crawlId: number;
}

const extractMembersPage = async ({ namespace, repository, sourceControl, userId, paginationInput, from, to, crawlId }: ExtractMembersPageInput) => {

  context.integrations.sourceControl = await initSourceControl(userId, sourceControl);

  const { members, paginationInfo } = await getMembers({
    externalRepositoryId: repository.externalId,
    namespaceName: namespace.name,
    repositoryId: repository.id,
    repositoryName: repository.name,
    perPage: paginationInput.perPage, // provjeriti ovo,da li je ovo nesto sto moze API da mijenja (procitati docs)
    page: paginationInput.page
  }, context);

  await extractMembersEvent.publish({
    memberIds: members.map(member => member.id)
  }, {
    crawlId,
    version: 1,
    caller: 'extract-member',
    sourceControl: sourceControl,
    userId: userId,
    timestamp: new Date().getTime(),
    from,
    to,
  });


  return { members, pagination: paginationInfo };
};

export const eventHandler = EventHandler(extractRepositoryEvent, async (ev) => {
  const repository = await db.select().from(repositories).where(eq(repositories.id, ev.properties.repositoryId)).get();
  const namespace = await db.select().from(namespaces).where(eq(namespaces.id, ev.properties.namespaceId)).get();

  if (!repository) throw new Error("invalid repo id");
  if (!namespace) throw new Error("Invalid namespace id");

  const { pagination } = await extractMembersPage({
    namespace: namespace,
    repository: repository,
    sourceControl: ev.metadata.sourceControl,
    userId: ev.metadata.userId,
    paginationInput: {
      page: 1,
      perPage: Number(Config.PER_PAGE),
    },
    from: ev.metadata.from,
    to: ev.metadata.to,
    crawlId: ev.metadata.crawlId,
  });

  const arrayOfExtractMemberPageMessageContent: { repository: Repository, namespace: Namespace, pagination: Pagination }[] = [];
  for (let i = 2; i <= pagination.totalPages; i++) {
    arrayOfExtractMemberPageMessageContent.push({
      namespace: namespace,
      repository: repository,
      pagination: {
        page: i,
        perPage: pagination.perPage,
        totalPages: pagination.totalPages
      }
    })
  }

  if (arrayOfExtractMemberPageMessageContent.length === 0) return;

    await insertEvent({ crawlId: ev.metadata.crawlId, eventNamespace: 'member', eventDetail: 'crawlInfo', data: {calls: pagination.totalPages }}, {db, entities: { events }})

  await sender.sendAll(arrayOfExtractMemberPageMessageContent, {
    version: 1,
    caller: 'extract-member',
    sourceControl: ev.metadata.sourceControl,
    userId: ev.metadata.userId,
    timestamp: new Date().getTime(),
    from: ev.metadata.from,
    to: ev.metadata.to,
    crawlId: ev.metadata.crawlId,
  });

},
{
  propertiesToLog: ["properties.repositoryId", "properties.namespaceId"],
  crawlEventNamespace: "member",
}
);

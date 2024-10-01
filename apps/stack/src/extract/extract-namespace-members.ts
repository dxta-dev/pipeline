import { EventHandler } from "@stack/config/create-event";
import { extractMembersEvent, extractRepositoryEvent } from "./events";
import { getNamespaceMembers } from "@dxta/extract-functions";
import type { Context,  GetNamespaceMembersEntities, GetNamespaceMembersSourceControl } from "@dxta/extract-functions";
import { members, namespaces, repositories, repositoriesToMembers, NamespaceSchema, RepositorySchema } from "@dxta/extract-schema";
import type { Namespace, Repository } from "@dxta/extract-schema";
import type { Pagination } from "@dxta/source-control";
import { Config } from "sst/node/config";

import { createMessageHandler } from "@stack/config/create-message";
import { eq } from "drizzle-orm";
import { metadataSchema, paginationSchema, MessageKind } from "./messages";
import { z } from 'zod';
import { insertEvent } from "@dxta/crawl-functions";
import { events } from "@dxta/crawl-schema";
import { filterNewExtractMembers } from "./filter-extract-members";
import { initDatabase, initIntegrations } from "./context";

type ExtractNamespaceMembersContext = Context<GetNamespaceMembersSourceControl, GetNamespaceMembersEntities>;

export const namespaceMemberSenderHandler = createMessageHandler({
  queueId: 'ExtractQueue',
  kind: MessageKind.NamespaceMember,
  metadataShape: metadataSchema.shape,
  contentShape: z.object({
    repositoryId: RepositorySchema.shape.id,
    namespace: NamespaceSchema,
    pagination: paginationSchema,
  }).shape,
  handler: async (message) => {
    await extractNamespaceMembersPage({
      namespace: message.content.namespace,
      paginationInput: message.content.pagination,
      repositoryId: message.content.repositoryId,
      sourceControl: message.metadata.sourceControl,
      userId: message.metadata.userId,
      from: message.metadata.from,
      to: message.metadata.to,
      crawlId: message.metadata.crawlId,
      dbUrl: message.metadata.dbUrl,
    });
  }
});

const { sender } = namespaceMemberSenderHandler;

const staticContext = {
  entities: {
    members,
    repositoriesToMembers
  },
} satisfies Partial<ExtractNamespaceMembersContext>;

type ExtractNamespaceMembersPageInput = {
  namespace: Namespace;
  repositoryId: Repository['id'];
  sourceControl: "github" | "gitlab";
  userId: string;
  paginationInput: Pick<Pagination, "page" | "perPage">;
  from: Date;
  to: Date;
  crawlId: number;
  dbUrl: string;
}

const extractNamespaceMembersPage = async ({ namespace, repositoryId, sourceControl, userId, paginationInput, from, to, crawlId, dbUrl }: ExtractNamespaceMembersPageInput) => {

  const dynamicContext = {
    integrations: await initIntegrations({ userId, sourceControl }),
    db: initDatabase({ dbUrl }),
  } satisfies Partial<ExtractNamespaceMembersContext>;

  const { members, paginationInfo } = await getNamespaceMembers({
    externalNamespaceId: namespace.externalId,
    namespaceName: namespace.name,
    repositoryId,
    perPage: paginationInput.perPage,
    page: paginationInput.page
  }, { ...staticContext, ...dynamicContext });

  const memberIds = filterNewExtractMembers(members).map(member => member.id);
  
  if (memberIds.length !== 0) {
    await extractMembersEvent.publish({
      memberIds
    }, {
      crawlId,
      version: 1,
      caller: 'extract-namespace-member',
      sourceControl: sourceControl,
      userId: userId,
      timestamp: new Date().getTime(),
      from,
      to,
      dbUrl
    });  
  }

  return { members, pagination: paginationInfo };
};

export const eventHandler = EventHandler(extractRepositoryEvent, async (ev) => {
  const db = initDatabase(ev.metadata);
  const repository = await db.select().from(repositories).where(eq(repositories.id, ev.properties.repositoryId)).get();
  const namespace = await db.select().from(namespaces).where(eq(namespaces.id, ev.properties.namespaceId)).get();

  if (!repository) throw new Error("invalid repo id");
  if (!namespace) throw new Error("Invalid namespace id");

  if (namespace.namespaceType === 'personal') {
    return;
  }

  const { pagination } = await extractNamespaceMembersPage({
    namespace: namespace,
    repositoryId: ev.properties.repositoryId,
    sourceControl: ev.metadata.sourceControl,
    userId: ev.metadata.userId,
    paginationInput: {
      page: 1,
      perPage: Number(Config.PER_PAGE), 
    },
    from: ev.metadata.from,
    to: ev.metadata.to,
    crawlId: ev.metadata.crawlId,
    dbUrl: ev.metadata.dbUrl,
  });

  const arrayOfExtractMemberPageMessageContent = []; 
  for (let i = 2; i <= pagination.totalPages; i++) {
    arrayOfExtractMemberPageMessageContent.push({
      namespace,
      repositoryId: ev.properties.repositoryId,
      pagination: {
        page: i,
        perPage: pagination.perPage,
        totalPages: pagination.totalPages
      }
    })
  }

  if (arrayOfExtractMemberPageMessageContent.length === 0)
    return;

  await insertEvent(
    { crawlId: ev.metadata.crawlId, eventNamespace: 'member', eventDetail: 'crawlInfo', data: { calls: pagination.totalPages } },
    { db, entities: { events } }
  );

  await sender.sendAll(arrayOfExtractMemberPageMessageContent, {
    version: 1,
    caller: 'extract-namespace-member',
    sourceControl: ev.metadata.sourceControl,
    userId: ev.metadata.userId,
    timestamp: new Date().getTime(),
    from: ev.metadata.from,
    to: ev.metadata.to,
    crawlId: ev.metadata.crawlId,
    dbUrl: ev.metadata.dbUrl,
  });

},   
{
  propertiesToLog: ["properties.repositoryId", "properties.namespaceId"],
  crawlEventNamespace: "member"
}
);

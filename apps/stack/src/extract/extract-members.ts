import { EventHandler } from "@stack/config/create-event";
import { extractMembersEvent, extractRepositoryEvent } from "./events";
import { getMembers } from "@dxta/extract-functions";
import type { Context, GetMembersEntities, GetMembersSourceControl } from "@dxta/extract-functions";
import { members, namespaces, repositories, repositoriesToMembers, NamespaceSchema, RepositorySchema } from "@dxta/extract-schema";
import type { Namespace, Repository } from "@dxta/extract-schema";
import { GitHubSourceControl, GitlabSourceControl } from "@dxta/source-control";
import type { Pagination } from "@dxta/source-control";
import { Config } from "sst/node/config";

import { createMessageHandler } from "@stack/config/create-message";
import { eq } from "drizzle-orm";
import { metadataSchema, paginationSchema, MessageKind } from "./messages";
import { z } from 'zod';
import { getClerkUserToken } from "./get-clerk-user-token";
import { insertEvent } from "@dxta/crawl-functions";
import { events } from "@dxta/crawl-schema";
import { getTenantDb, type OmitDb } from "@stack/config/get-tenant-db";
import { filterNewExtractMembers } from "./filter-extract-members";

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
      to: message.metadata.to,
      tenantId: message.metadata.tenantId,
    });
  }
});

const { sender } = memberSenderHandler;

const initSourceControl = async (userId: string, sourceControl: 'github' | 'gitlab') => {
  const accessToken = await getClerkUserToken(userId, `oauth_${sourceControl}`);
  if (sourceControl === 'github') return new GitHubSourceControl({ auth: accessToken });
  if (sourceControl === 'gitlab') return new GitlabSourceControl(accessToken);
  return null;
}

const context: OmitDb<Context<GetMembersSourceControl, GetMembersEntities>> = {
  entities: {
    members,
    repositoriesToMembers
  },
  integrations: {
    sourceControl: null,
  },
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
  tenantId: number;
}

const extractMembersPage = async ({ namespace, repository, sourceControl, userId, paginationInput, from, to, crawlId, tenantId }: ExtractMembersPageInput) => {

  context.integrations.sourceControl = await initSourceControl(userId, sourceControl);

  const { members, paginationInfo } = await getMembers({
    externalRepositoryId: repository.externalId,
    namespaceName: namespace.name,
    repositoryId: repository.id,
    repositoryName: repository.name,
    perPage: paginationInput.perPage, // provjeriti ovo,da li je ovo nesto sto moze API da mijenja (procitati docs)
    page: paginationInput.page
  }, { ...context, db: getTenantDb(tenantId) });

  const memberIds = filterNewExtractMembers(members).map(member => member.id);
  
  if (memberIds.length !== 0) {
    await extractMembersEvent.publish({
      memberIds
    }, {
      tenantId,
      crawlId,
      version: 1,
      caller: 'extract-member',
      sourceControl: sourceControl,
      userId: userId,
      timestamp: new Date().getTime(),
      from,
      to,
    });
  }

  return { members, pagination: paginationInfo };
};

export const eventHandler = EventHandler(extractRepositoryEvent, async (ev) => {
  const db = getTenantDb(ev.metadata.tenantId);
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
    tenantId: ev.metadata.tenantId,
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

  await insertEvent(
    { crawlId: ev.metadata.crawlId, eventNamespace: 'member', eventDetail: 'crawlInfo', data: { calls: pagination.totalPages } },
    { db, entities: { events } }
  );

  await sender.sendAll(arrayOfExtractMemberPageMessageContent, {
    version: 1,
    caller: 'extract-member',
    sourceControl: ev.metadata.sourceControl,
    userId: ev.metadata.userId,
    timestamp: new Date().getTime(),
    from: ev.metadata.from,
    to: ev.metadata.to,
    crawlId: ev.metadata.crawlId,
    tenantId: ev.metadata.tenantId,
  });

},
{
  propertiesToLog: ["properties.repositoryId", "properties.namespaceId"],
  crawlEventNamespace: "member",
}
);

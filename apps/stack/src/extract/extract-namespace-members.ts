import { EventHandler } from "@stack/config/create-event";
import { extractMembersEvent, extractRepositoryEvent } from "./events";
import { Clerk } from "@clerk/clerk-sdk-node";
import { getNamespaceMembers } from "@dxta/extract-functions";
import type { Context,  GetNamespaceMembersEntities, GetNamespaceMembersSourceControl } from "@dxta/extract-functions";
import { members, namespaces, repositories, repositoriesToMembers, NamespaceSchema, RepositorySchema } from "@dxta/extract-schema";
import type { Namespace, Repository } from "@dxta/extract-schema";
import { GitHubSourceControl, GitlabSourceControl } from "@dxta/source-control";
import type { Pagination } from "@dxta/source-control";
import { Config } from "sst/node/config";

import { createMessageHandler } from "@stack/config/create-message";
import { eq } from "drizzle-orm";
import { metadataSchema, paginationSchema, MessageKind } from "./messages";
import { z } from 'zod';
import { insertEvent } from "@dxta/crawl-functions";
import { events } from "@dxta/crawl-schema";
import { getTenantDb, type OmitDb } from "@stack/config/get-tenant-db";
import { filterNewExtractMembers } from "./filter-extract-members";

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
      tenantId: message.metadata.tenantId,
    });
  }
});

const { sender } = namespaceMemberSenderHandler;

const clerkClient = Clerk({ secretKey: Config.CLERK_SECRET_KEY });

const fetchSourceControlAccessToken = async (userId: string, forgeryIdProvider: 'oauth_github' | 'oauth_gitlab') => {
  const [userOauthAccessTokenPayload, ...rest] = await clerkClient.users.getUserOauthAccessToken(userId, forgeryIdProvider);
  if (!userOauthAccessTokenPayload) throw new Error("Failed to get token");
  if (rest.length !== 0) throw new Error("wtf ?");

  return userOauthAccessTokenPayload.token;
}

const initSourceControl = async (userId: string, sourceControl: 'github' | 'gitlab') => {
  const accessToken = await fetchSourceControlAccessToken(userId, `oauth_${sourceControl}`);
  if (sourceControl === 'github') return new GitHubSourceControl({ auth: accessToken });
  if (sourceControl === 'gitlab') return new GitlabSourceControl(accessToken);
  return null;
}

const context: OmitDb<Context<GetNamespaceMembersSourceControl, GetNamespaceMembersEntities>> = {
  entities: {
    members,
    repositoriesToMembers
  },
  integrations: {
    sourceControl: null,
  },
};

type ExtractNamespaceMembersPageInput = {
  namespace: Namespace;
  repositoryId: Repository['id'];
  sourceControl: "github" | "gitlab";
  userId: string;
  paginationInput: Pick<Pagination, "page" | "perPage">;
  from: Date;
  to: Date;
  crawlId: number;
  tenantId: number;
}

const extractNamespaceMembersPage = async ({ namespace, repositoryId, sourceControl, userId, paginationInput, from, to, crawlId, tenantId }: ExtractNamespaceMembersPageInput) => {

  context.integrations.sourceControl = await initSourceControl(userId, sourceControl);

  const { members, paginationInfo } = await getNamespaceMembers({
    externalNamespaceId: namespace.externalId,
    namespaceName: namespace.name,
    repositoryId,
    perPage: paginationInput.perPage,
    page: paginationInput.page
  }, { ...context, db: getTenantDb(tenantId) });

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
      tenantId
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
    tenantId: ev.metadata.tenantId,
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
    tenantId: ev.metadata.tenantId,
  });

},   
{
  propertiesToLog: ["properties.repositoryId", "properties.namespaceId"],
  crawlEventNamespace: "member"
}
);

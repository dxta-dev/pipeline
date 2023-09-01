import { EventHandler } from "sst/node/event-bus";
import { extractMembersEvent, extractRepositoryEvent } from "./events";
import { Clerk } from "@clerk/clerk-sdk-node";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { getNamespaceMembers } from "@acme/extract-functions";
import type { Context,  GetNamespaceMembersEntities, GetNamespaceMembersSourceControl } from "@acme/extract-functions";
import { members, namespaces, repositories, repositoriesToMembers, NamespaceSchema, RepositorySchema } from "@acme/extract-schema";
import type { Namespace, Repository } from "@acme/extract-schema";
import { GitHubSourceControl, GitlabSourceControl } from "@acme/source-control";
import type { Pagination } from "@acme/source-control";
import { Config } from "sst/node/config";

import { createMessageHandler } from "./create-message";
import { eq } from "drizzle-orm";
import { metadataSchema, paginationSchema, MessageKind } from "./messages";
import { z } from 'zod';

export const namespaceMemberSenderHandler = createMessageHandler({
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
      paginationInfo: message.content.pagination,
      repositoryId: message.content.repositoryId,
      sourceControl: message.metadata.sourceControl,
      userId: message.metadata.userId
    });
  }
});

const { sender } = namespaceMemberSenderHandler;

const clerkClient = Clerk({ secretKey: Config.CLERK_SECRET_KEY });
const client = createClient({ url: Config.DATABASE_URL, authToken: Config.DATABASE_AUTH_TOKEN });

const fetchSourceControlAccessToken = async (userId: string, forgeryIdProvider: 'oauth_github' | 'oauth_gitlab') => {
  const [userOauthAccessTokenPayload, ...rest] = await clerkClient.users.getUserOauthAccessToken(userId, forgeryIdProvider);
  if (!userOauthAccessTokenPayload) throw new Error("Failed to get token");
  if (rest.length !== 0) throw new Error("wtf ?");

  return userOauthAccessTokenPayload.token;
}

const initSourceControl = async (userId: string, sourceControl: 'github' | 'gitlab') => {
  const accessToken = await fetchSourceControlAccessToken(userId, `oauth_${sourceControl}`);
  if (sourceControl === 'github') return new GitHubSourceControl(accessToken);
  if (sourceControl === 'gitlab') return new GitlabSourceControl(accessToken);
  return null;
}

const db = drizzle(client);

const context: Context<GetNamespaceMembersSourceControl, GetNamespaceMembersEntities> = {
  entities: {
    members,
    repositoriesToMembers
  },
  integrations: {
    sourceControl: null,
  },
  db,
};

type ExtractNamespaceMembersPageInput = {
  namespace: Namespace;
  repositoryId: Repository['id'];
  sourceControl: "github" | "gitlab";
  userId: string;
  paginationInfo?: Pagination;
}

const extractNamespaceMembersPage = async ({ namespace, repositoryId, sourceControl, userId, paginationInfo }: ExtractNamespaceMembersPageInput) => {
  const page = paginationInfo?.page;
  const perPage = paginationInfo?.perPage;

  context.integrations.sourceControl = await initSourceControl(userId, sourceControl);

  const { members, paginationInfo: resultPaginationInfo } = await getNamespaceMembers({
    namespaceName: namespace.name,
    repositoryId,
    perPage: perPage,
    page: page
  }, context);

  await extractMembersEvent.publish({
    memberIds: members.map(member => member.id)
  }, {
    version: 1,
    caller: 'extract-namespace-member',
    sourceControl: sourceControl,
    userId: userId,
    timestamp: new Date().getTime(),
  });


  return { members, pagination: resultPaginationInfo };
};

export const eventHandler = EventHandler(extractRepositoryEvent, async (ev) => {
  const repository = await db.select().from(repositories).where(eq(repositories.id, ev.properties.repositoryId)).get();
  const namespace = await db.select().from(namespaces).where(eq(namespaces.id, ev.properties.namespaceId)).get();

  if (!repository) throw new Error("invalid repo id");
  if (!namespace) throw new Error("Invalid namespace id");

  const { pagination } = await extractNamespaceMembersPage({
    namespace: namespace,
    repositoryId: ev.properties.repositoryId,
    sourceControl: ev.metadata.sourceControl,
    userId: ev.metadata.userId,
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

  await sender.sendAll(arrayOfExtractMemberPageMessageContent, {
    version: 1,
    caller: 'extract-namespace-member',
    sourceControl: ev.metadata.sourceControl,
    userId: ev.metadata.userId,
    timestamp: new Date().getTime(),
  });

});

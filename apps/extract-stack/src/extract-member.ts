import { EventHandler } from "sst/node/event-bus";
import { extractRepositoryEvent } from "./events";
import { Clerk } from "@clerk/clerk-sdk-node";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { getMembers } from "@acme/extract-functions";
import type { Context, GetMembersEntities, GetMembersSourceControl } from "@acme/extract-functions";
import { members, repositoriesToMembers } from "@acme/extract-schema";
import type { Namespace, Repository } from "@acme/extract-schema";
import { GitHubSourceControl, GitlabSourceControl } from "@acme/source-control";
import type { Pagination } from "@acme/source-control";
import { Config } from "sst/node/config";
import { extractMemberPageBatchMessage } from "./messages";

import { QueueHandler } from "./create-message";

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
  namespace: Namespace | null;
  repository: Repository;
  sourceControl: "github" | "gitlab";
  userId: string;
  paginationInfo: Pagination | null;
}

const extractMembersPage = async ({ namespace, repository, sourceControl, userId, paginationInfo }: ExtractMembersPageInput) => {
  const page = paginationInfo?.page;
  const perPage = paginationInfo?.perPage;

  try {
    context.integrations.sourceControl = await initSourceControl(userId, sourceControl);
  } catch (error) {
    console.error(error);
    return;
  }

  const { paginationInfo: resultPaginationInfo } = await getMembers({
    externalRepositoryId: repository.externalId,
    namespaceName: namespace?.name || "",
    repositoryId: repository.id,
    repositoryName: repository.name,
    perPage: perPage,
    page: page
  }, context);

  return resultPaginationInfo;
};

const range = (a: number, b: number) => Array.apply(0, { length: b - a + 1 } as number[]).map((_, index) => index + a);
const chunks = <T>(array: Array<T>, size: number) => Array.apply(0, { length: Math.ceil(array.length / size) } as unknown[]).map((_, index) => array.slice(index * size, (index + 1) * size));

export const eventHandler = EventHandler(extractRepositoryEvent, async (ev) => {

  const pagination = await extractMembersPage({
    namespace: ev.properties.namespace,
    repository: ev.properties.repository,
    sourceControl: ev.metadata.sourceControl,
    userId: ev.metadata.userId,
    paginationInfo: { page: 1, perPage: 2, totalPages: 1000 },
  });

  if (!pagination) return;

  const remainingMemberPages = range(2, pagination.totalPages)
    .map(page => ({
      page,
      perPage: pagination.perPage,
      totalPages: pagination.totalPages
    } satisfies Pagination));

  const batchedPages = chunks(remainingMemberPages, 10);

  await Promise.all(batchedPages.map(batch => extractMemberPageBatchMessage.send(
    batch.map(page => ({
      namespace: ev.properties.namespace,
      repository: ev.properties.repository,
      pagination: page
    })), {
    version: 1,
    caller: 'extract-member',
    sourceControl: ev.metadata.sourceControl,
    userId: ev.metadata.userId,
    timestamp: new Date().getTime(),
  })));
});

export const queueHandler = QueueHandler(extractMemberPageBatchMessage, async (message) => {
  await extractMembersPage({
    namespace: message.content.namespace,
    paginationInfo: message.content.pagination,
    repository: message.content.repository,
    sourceControl: message.metadata.sourceControl,
    userId: message.metadata.userId
  });
});
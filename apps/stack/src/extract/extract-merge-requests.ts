import { createClient } from "@libsql/client";
import { EventHandler } from "@stack/config/create-event";
import { createMessageHandler } from "@stack/config/create-message";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { Config } from "sst/node/config";
import { z } from "zod";

import { insertEvent } from "@acme/crawl-functions";
import { events } from "@acme/crawl-schema";
import {
  getMergeRequests,
  type Context,
  type GetMergeRequestsEntities,
  type GetMergeRequestsSourceControl,
} from "@acme/extract-functions";
import {
  mergeRequests,
  namespaces,
  NamespaceSchema,
  repositories,
  RepositorySchema,
} from "@acme/extract-schema";
import { GitHubSourceControl, GitlabSourceControl } from "@acme/source-control";

import { extractMergeRequestsEvent, extractRepositoryEvent } from "./events";
import { getClerkUserToken } from "./get-clerk-user-token";
import { MessageKind, metadataSchema, paginationSchema } from "./messages";

export const mergeRequestSenderHandler = createMessageHandler({
  kind: MessageKind.MergeRequest,
  metadataShape: metadataSchema.shape,
  contentShape: z.object({
    repository: RepositorySchema,
    namespace: NamespaceSchema,
    pagination: paginationSchema,
  }).shape,
  handler: async (message) => {
    if (!message) {
      console.warn("Expected message to have content,but get empty");
      return;
    }

    context.integrations.sourceControl = await initSourceControl(
      message.metadata.userId,
      message.metadata.sourceControl,
    );

    const { namespace, pagination, repository } = message.content;

    if (!namespace) throw new Error("Invalid namespace id");

    const { mergeRequests } = await getMergeRequests(
      {
        externalRepositoryId: repository.externalId,
        namespaceName: namespace.name,
        repositoryName: repository.name,
        repositoryId: repository.id,
        page: pagination.page,
        perPage: pagination.perPage,
        timePeriod: { from: message.metadata.from, to: message.metadata.to },
        totalPages: pagination.totalPages,
      },
      context,
    );

    await extractMergeRequestsEvent.publish(
      {
        mergeRequestIds: mergeRequests.map((mr) => mr.id),
        namespaceId: namespace.id,
        repositoryId: repository.id,
      },
      {
        crawlId: message.metadata.crawlId,
        version: 1,
        caller: "extract-merge-requests",
        sourceControl: message.metadata.sourceControl,
        userId: message.metadata.userId,
        timestamp: new Date().getTime(),
        from: message.metadata.from,
        to: message.metadata.to,
      },
    );
  },
});

const { sender } = mergeRequestSenderHandler;

const client = createClient({
  url: Config.EXTRACT_DATABASE_URL,
  authToken: Config.EXTRACT_DATABASE_AUTH_TOKEN,
});

const crawlClient = createClient({
  url: Config.CRAWL_DATABASE_URL,
  authToken: Config.CRAWL_DATABASE_AUTH_TOKEN,
});

const crawlDb = drizzle(crawlClient);

const db = drizzle(client);

const context: Context<
  GetMergeRequestsSourceControl,
  GetMergeRequestsEntities
> = {
  entities: {
    mergeRequests,
  },
  integrations: {
    sourceControl: null,
  },
  db,
};

const initSourceControl = async (
  userId: string,
  sourceControl: "github" | "gitlab",
) => {
  const accessToken = await getClerkUserToken(userId, `oauth_${sourceControl}`);
  if (sourceControl === "github") return new GitHubSourceControl(accessToken);
  if (sourceControl === "gitlab") return new GitlabSourceControl(accessToken);
  return null;
};

export const eventHandler = EventHandler(
  extractRepositoryEvent,
  async (evt) => {
    const repository = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, evt.properties.repositoryId))
      .get();
    const namespace = await db
      .select()
      .from(namespaces)
      .where(eq(namespaces.id, evt.properties.namespaceId))
      .get();

    if (!repository) throw new Error("invalid repo id");
    if (!namespace) throw new Error("Invalid namespace id");

    const sourceControl = evt.metadata.sourceControl;

    context.integrations.sourceControl = await initSourceControl(
      evt.metadata.userId,
      sourceControl,
    );

    const startDate = evt.metadata.from;
    const endDate = evt.metadata.to;

    const timePeriod = {
      from: startDate,
      to: endDate,
    };

    const { mergeRequests, paginationInfo } = await getMergeRequests(
      {
        externalRepositoryId: repository.externalId,
        namespaceName: namespace.name,
        repositoryName: repository.name,
        repositoryId: repository.id,
        perPage: Number(Config.PER_PAGE),
        timePeriod,
      },
      context,
    );

    await insertEvent(
      {
        crawlId: evt.metadata.crawlId,
        eventNamespace: "mergeRequest",
        eventDetail: "crawlInfo",
        data: {
          calls: paginationInfo.totalPages,
        },
      },
      { db: crawlDb, entities: { events } },
    );

    await extractMergeRequestsEvent.publish(
      {
        mergeRequestIds: mergeRequests.map((mr) => mr.id),
        namespaceId: namespace.id,
        repositoryId: repository.id,
      },
      {
        crawlId: evt.metadata.crawlId,
        version: 1,
        caller: "extract-merge-requests",
        sourceControl,
        userId: evt.metadata.userId,
        timestamp: new Date().getTime(),
        from: evt.metadata.from,
        to: evt.metadata.to,
      },
    );

    const arrayOfExtractMergeRequests = [];
    for (let i = paginationInfo.page + 1; i <= paginationInfo.totalPages; i++) {
      arrayOfExtractMergeRequests.push({
        repository,
        namespace: namespace,
        pagination: {
          page: i,
          perPage: paginationInfo.perPage,
          totalPages: paginationInfo.totalPages,
        },
      });
    }

    if (arrayOfExtractMergeRequests.length === 0) return;

    await sender.sendAll(arrayOfExtractMergeRequests, {
      crawlId: evt.metadata.crawlId,
      version: 1,
      caller: "extract-merge-requests",
      sourceControl,
      userId: evt.metadata.userId,
      timestamp: new Date().getTime(),
      from: evt.metadata.from,
      to: evt.metadata.to,
    });
  },
  ["properties.repositoryId", "properties.namespaceId"],
  "mergeRequest"
);

import { EventHandler } from "@stack/config/create-event";
import { createMessageHandler } from "@stack/config/create-message";
import { eq } from "drizzle-orm";
import { Config } from "sst/node/config";
import { z } from "zod";

import { insertEvent } from "@dxta/crawl-functions";
import { events } from "@dxta/crawl-schema";
import {
  getMergeRequests,
  type Context,
  type GetMergeRequestsEntities,
  type GetMergeRequestsSourceControl,
} from "@dxta/extract-functions";
import {
  mergeRequests,
  namespaces,
  NamespaceSchema,
  repositories,
  RepositorySchema,
} from "@dxta/extract-schema";
import { GitHubSourceControl, GitlabSourceControl } from "@dxta/source-control";

import { extractMergeRequestsEvent, extractRepositoryEvent } from "./events";
import { getClerkUserToken } from "./get-clerk-user-token";
import { MessageKind, metadataSchema, paginationSchema } from "./messages";
import { getTenantDb, type OmitDb } from "@stack/config/get-tenant-db";

export const mergeRequestSenderHandler = createMessageHandler({
  queueId: 'ExtractQueue',
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
      { ...context, db: getTenantDb(message.metadata.tenantId) },
    );

    if (mergeRequests.length === 0) return;

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
        tenantId: message.metadata.tenantId,
      },
    );
  },
});

const { sender } = mergeRequestSenderHandler;

const context: OmitDb<Context<
  GetMergeRequestsSourceControl,
  GetMergeRequestsEntities
>> = {
  entities: {
    mergeRequests,
  },
  integrations: {
    sourceControl: null,
  },
};

const initSourceControl = async (
  userId: string,
  sourceControl: "github" | "gitlab",
) => {
  const accessToken = await getClerkUserToken(userId, `oauth_${sourceControl}`);
  if (sourceControl === 'github') return new GitHubSourceControl({ auth: accessToken });
  if (sourceControl === "gitlab") return new GitlabSourceControl(accessToken);
  return null;
};

export const eventHandler = EventHandler(
  extractRepositoryEvent,
  async (ev) => {
    const db = getTenantDb(ev.metadata.tenantId);
    const repository = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, ev.properties.repositoryId))
      .get();
    const namespace = await db
      .select()
      .from(namespaces)
      .where(eq(namespaces.id, ev.properties.namespaceId))
      .get();

    if (!repository) throw new Error("invalid repo id");
    if (!namespace) throw new Error("Invalid namespace id");

    const sourceControl = ev.metadata.sourceControl;

    context.integrations.sourceControl = await initSourceControl(
      ev.metadata.userId,
      sourceControl,
    );

    const startDate = ev.metadata.from;
    const endDate = ev.metadata.to;

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
      { ...context, db },
    );

    if (mergeRequests.length === 0 && (paginationInfo.totalPages - paginationInfo.page) === 0) return;

    await insertEvent(
      {
        crawlId: ev.metadata.crawlId,
        eventNamespace: "mergeRequest",
        eventDetail: "crawlInfo",
        data: {
          calls: paginationInfo.totalPages,
        },
      },
      { db, entities: { events } },
    );

    if (mergeRequests.length !== 0) {
      await extractMergeRequestsEvent.publish(
        {
          mergeRequestIds: mergeRequests.map((mr) => mr.id),
          namespaceId: namespace.id,
          repositoryId: repository.id,
        },
        {
          crawlId: ev.metadata.crawlId,
          version: 1,
          caller: "extract-merge-requests",
          sourceControl,
          userId: ev.metadata.userId,
          timestamp: new Date().getTime(),
          from: ev.metadata.from,
          to: ev.metadata.to,
          tenantId: ev.metadata.tenantId,
        },
      );
    }

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
      crawlId: ev.metadata.crawlId,
      version: 1,
      caller: "extract-merge-requests",
      sourceControl,
      userId: ev.metadata.userId,
      timestamp: new Date().getTime(),
      from: ev.metadata.from,
      to: ev.metadata.to,
      tenantId: ev.metadata.tenantId,
    });
  }, 
  {
    propertiesToLog: ["properties.repositoryId", "properties.namespaceId"],
    crawlEventNamespace: "mergeRequest",
  }
);

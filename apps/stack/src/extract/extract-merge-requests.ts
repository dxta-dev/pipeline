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
  repositoryShas,
} from "@dxta/extract-schema";

import { extractMergeRequestsEvent, extractRepositoryEvent } from "./events";
import { MessageKind, metadataSchema, paginationSchema } from "./messages";
import { initDatabase, initSourceControl } from "./context";

type ExtractMergeRequestsContext = Context<GetMergeRequestsSourceControl, GetMergeRequestsEntities>;

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

    const dynamicContext = {
      integrations: { sourceControl: await initSourceControl(message.metadata) },
      db: initDatabase(message.metadata),
    } satisfies Partial<ExtractMergeRequestsContext>;

    const { namespace, pagination, repository } = message.content;

    if (!namespace) throw new Error("Invalid namespace id");

    const { processableMergeRequests } = await getMergeRequests(
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
      { ...staticContext, ...dynamicContext },
    );

    if (processableMergeRequests.length === 0) return;

    await extractMergeRequestsEvent.publish(
      {
        mergeRequestIds: processableMergeRequests.map((mr) => mr.id),
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
        dbUrl: message.metadata.dbUrl,
      },
    );
  },
});

const { sender } = mergeRequestSenderHandler;

const staticContext = {
  entities: {
    mergeRequests,
    repositoryShas
  },
} satisfies Partial<ExtractMergeRequestsContext>;

export const eventHandler = EventHandler(
  extractRepositoryEvent,
  async (ev) => {
    const db = initDatabase(ev.metadata);
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

    const dynamicContext = {
      integrations: { sourceControl: await initSourceControl(ev.metadata) },
      db: initDatabase(ev.metadata),
    } satisfies Partial<ExtractMergeRequestsContext>;

    const startDate = ev.metadata.from;
    const endDate = ev.metadata.to;

    const timePeriod = {
      from: startDate,
      to: endDate,
    };

    const { mergeRequests, paginationInfo, processableMergeRequests } = await getMergeRequests(
      {
        externalRepositoryId: repository.externalId,
        namespaceName: namespace.name,
        repositoryName: repository.name,
        repositoryId: repository.id,
        perPage: Number(Config.PER_PAGE),
        timePeriod,
      },
      { ...staticContext, ...dynamicContext },
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

    if (processableMergeRequests.length !== 0) {
      await extractMergeRequestsEvent.publish(
        {
          mergeRequestIds: processableMergeRequests.map((mr) => mr.id),
          namespaceId: namespace.id,
          repositoryId: repository.id,
        },
        {
          crawlId: ev.metadata.crawlId,
          version: 1,
          caller: "extract-merge-requests",
          sourceControl: ev.metadata.sourceControl,
          userId: ev.metadata.userId,
          timestamp: new Date().getTime(),
          from: ev.metadata.from,
          to: ev.metadata.to,
          dbUrl: ev.metadata.dbUrl,
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
      sourceControl: ev.metadata.sourceControl,
      userId: ev.metadata.userId,
      timestamp: new Date().getTime(),
      from: ev.metadata.from,
      to: ev.metadata.to,
      dbUrl: ev.metadata.dbUrl,
    });
  }, 
  {
    propertiesToLog: ["properties.repositoryId", "properties.namespaceId"],
    crawlEventNamespace: "mergeRequest",
  }
);

import { EventHandler } from "@stack/config/create-event";
import { createMessageHandler } from "@stack/config/create-message";
import { z } from "zod";

import { getTimelineEvents, type Context, type GetTimelineEventsEntities, type GetTimelineEventsSourceControl } from "@dxta/extract-functions";
import { members, mergeRequests, MergeRequestSchema, namespaces, NamespaceSchema, repositories, repositoriesToMembers, RepositorySchema, timelineEvents, gitIdentities } from "@dxta/extract-schema";

import { extractMembersEvent, extractMergeRequestsEvent } from "./events";
import { MessageKind, metadataSchema } from "./messages";
import { filterNewExtractMembers } from "./filter-extract-members";
import { initDatabase, initIntegrations } from "./context";
import { Config } from "sst/node/config";

type ExtractTimelineEventsContext = Context<GetTimelineEventsSourceControl, GetTimelineEventsEntities>;

export const timelineEventsSenderHandler = createMessageHandler({
  queueId: 'ExtractQueue',
  kind: MessageKind.TimelineEvent,
  metadataShape: metadataSchema.shape,
  contentShape: z.object({
    mergeRequestId: MergeRequestSchema.shape.id,
    repositoryId: RepositorySchema.shape.id,
    namespaceId: NamespaceSchema.shape.id,
  }).shape,
  handler: async (message) => {
    if (!message) {
      console.warn("Expected message to have content,but get empty");
      return;
    }

    const dynamicContext = {
      integrations: await initIntegrations({
        sourceControl: message.metadata.sourceControl,
        userId: message.metadata.userId,
        sourceControlOptions: {
          fetchTimelineEventsPerPage: Number(Config.FETCH_TIMELINE_EVENTS_PER_PAGE),
        }
      }),
      db: initDatabase(message.metadata),
    } satisfies Partial<ExtractTimelineEventsContext>;

    const { userId, sourceControl } = message.metadata;
    const { mergeRequestId, namespaceId, repositoryId } = message.content;

    const { members } = await getTimelineEvents({
        mergeRequestId,
        namespaceId,
        repositoryId,
      }, { ...staticContext, ...dynamicContext }
    );

    const memberIds = filterNewExtractMembers(members).map(member => member.id);
    if (memberIds.length === 0) return;

    await extractMembersEvent.publish({ memberIds }, {
      crawlId: message.metadata.crawlId,
      version: 1,
      caller: 'extract-timeline-events',
      sourceControl,
      userId,
      timestamp: new Date().getTime(),
      from: message.metadata.from,
      to: message.metadata.to,
      dbUrl: message.metadata.dbUrl,
    });
  }
});

const { sender } = timelineEventsSenderHandler;

const staticContext = {
  entities: {
    namespaces,
    repositories,
    mergeRequests,
    timelineEvents,
    members,
    repositoriesToMembers,
    gitIdentities,
  },
} satisfies Partial<ExtractTimelineEventsContext>;

export const eventHandler = EventHandler(extractMergeRequestsEvent, async (ev) => {
    const { mergeRequestIds, namespaceId, repositoryId } = ev.properties;

    const { sourceControl, userId } = ev.metadata;

    const arrayOfExtractMergeRequestData = [];
    for (let i = 0; i < mergeRequestIds.length; i += 1) {
      arrayOfExtractMergeRequestData.push({
        mergeRequestId: mergeRequestIds[i]!,
        namespaceId,
        repositoryId,
      });
    }

    await sender.sendAll(arrayOfExtractMergeRequestData, {
      crawlId: ev.metadata.crawlId,
      version: 1,
      caller: "extract-timeline-events",
      sourceControl,
      userId,
      timestamp: new Date().getTime(),
      from: ev.metadata.from,
      to: ev.metadata.to,
      dbUrl: ev.metadata.dbUrl,
    });
  },
);

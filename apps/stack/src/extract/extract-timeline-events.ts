import { EventHandler } from "@stack/config/create-event";
import { createMessageHandler } from "@stack/config/create-message";
import { z } from "zod";

import { getTimelineEvents, type Context, type GetTimelineEventsEntities, type GetTimelineEventsSourceControl } from "@dxta/extract-functions";
import { members, mergeRequests, MergeRequestSchema, namespaces, NamespaceSchema, repositories, repositoriesToMembers, RepositorySchema, timelineEvents, gitIdentities } from "@dxta/extract-schema";
import { GitHubSourceControl, GitlabSourceControl } from "@dxta/source-control";

import { extractMembersEvent, extractMergeRequestsEvent } from "./events";
import { getClerkUserToken } from "./get-clerk-user-token";
import { MessageKind, metadataSchema } from "./messages";
import { getTenantDb, type OmitDb } from "@stack/config/get-tenant-db";
import { Config } from "sst/node/config";
import { filterNewExtractMembers } from "./filter-extract-members";

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

    context.integrations.sourceControl = await initSourceControl(message.metadata.userId, message.metadata.sourceControl);

    const { userId, sourceControl } = message.metadata;
    const { mergeRequestId, namespaceId, repositoryId } = message.content;

    const { members } = await getTimelineEvents({
        mergeRequestId,
        namespaceId,
        repositoryId,
      }, { ...context, db: getTenantDb(message.metadata.tenantId) }
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
      tenantId: message.metadata.tenantId,
    });
  }
});

const { sender } = timelineEventsSenderHandler;

const context: OmitDb<Context<
  GetTimelineEventsSourceControl,
  GetTimelineEventsEntities
>> = {
  entities: {
    namespaces,
    repositories,
    mergeRequests,
    timelineEvents,
    members,
    repositoriesToMembers,
    gitIdentities,
  },
  integrations: {
    sourceControl: null,
  },
};

const initSourceControl = async (userId: string, sourceControl: "github" | "gitlab") => {
  const accessToken = await getClerkUserToken(userId, `oauth_${sourceControl}`);
  if (sourceControl === 'github') return new GitHubSourceControl({ auth: accessToken, fetchTimelineEventsPerPage: Number(Config.FETCH_TIMELINE_EVENTS_PER_PAGE) });
  if (sourceControl === "gitlab") return new GitlabSourceControl(accessToken);
  return null;
};

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
      tenantId: ev.metadata.tenantId,
    });
  },
);

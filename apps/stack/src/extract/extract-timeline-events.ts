import { createClient } from "@libsql/client";
import { EventHandler } from "@stack/config/create-event";
import { createMessageHandler } from "@stack/config/create-message";
import { drizzle } from "drizzle-orm/libsql";
import { Config } from "sst/node/config";
import { z } from "zod";

import { getTimelineEvents, type Context, type GetTimelineEventsEntities, type GetTimelineEventsSourceControl } from "@acme/extract-functions";
import { mergeRequests, MergeRequestSchema, namespaces, NamespaceSchema, repositories, RepositorySchema, timelineEvents } from "@acme/extract-schema";
import { GitHubSourceControl, GitlabSourceControl } from "@acme/source-control";

import { extractMergeRequestsEvent } from "./events";
import { getClerkUserToken } from "./get-clerk-user-token";
import { MessageKind, metadataSchema } from "./messages";

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

    const { mergeRequestId, namespaceId, repositoryId } = message.content;

    await getTimelineEvents({
        mergeRequestId,
        namespaceId,
        repositoryId,
      }, context
    );
  }
});

const { sender } = timelineEventsSenderHandler;

const client = createClient({
  url: Config.EXTRACT_DATABASE_URL,
  authToken: Config.EXTRACT_DATABASE_AUTH_TOKEN,
});
const db = drizzle(client);

const context: Context<
  GetTimelineEventsSourceControl,
  GetTimelineEventsEntities
> = {
  entities: {
    namespaces,
    repositories,
    mergeRequests,
    timelineEvents,
  },
  integrations: {
    sourceControl: null,
  },
  db,
};

const initSourceControl = async (userId: string, sourceControl: "github" | "gitlab") => {
  const accessToken = await getClerkUserToken(userId, `oauth_${sourceControl}`);
  if (sourceControl === "github") return new GitHubSourceControl(accessToken);
  if (sourceControl === "gitlab") return new GitlabSourceControl(accessToken);
  return null;
};

export const eventHandler = EventHandler(extractMergeRequestsEvent, async (evt) => {
    const { mergeRequestIds, namespaceId, repositoryId } = evt.properties;

    const { sourceControl, userId } = evt.metadata;

    const arrayOfExtractMergeRequestData = [];
    for (let i = 0; i < mergeRequestIds.length; i += 1) {
      arrayOfExtractMergeRequestData.push({
        mergeRequestId: mergeRequestIds[i]!,
        namespaceId,
        repositoryId,
      });
    }

    await sender.sendAll(arrayOfExtractMergeRequestData, {
      crawlId: evt.metadata.crawlId,
      version: 1,
      caller: "extract-timeline-events",
      sourceControl,
      userId,
      timestamp: new Date().getTime(),
      from: evt.metadata.from,
      to: evt.metadata.to,
    });
  },
);

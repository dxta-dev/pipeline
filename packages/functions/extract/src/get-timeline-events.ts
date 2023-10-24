import type { TimelineEvents } from "@acme/extract-schema";
import type { Entities, ExtractFunction } from "./config"
import type { SourceControl } from "@acme/source-control";
import { eq, sql } from "drizzle-orm";

export type GetTimelineEventsInputs = {
  mergeRequestId: number;
  namespaceId: number;
  repositoryId: number;
}

export type GetTimelineEventsOutput = {
  timelineEvents: TimelineEvents[];
};

export type GetTimelineEventsSourceControl = Pick<SourceControl, "fetchTimelineEvents">;
export type GetTimelineEventsEntities = Pick<Entities, "namespaces" | "repositories" | "mergeRequests" | "timelineEvents">;

export type GetTimelineEventsFunction = ExtractFunction<GetTimelineEventsInputs, GetTimelineEventsOutput, GetTimelineEventsSourceControl, GetTimelineEventsEntities>

export const getTimelineEvents: GetTimelineEventsFunction = async (
  { mergeRequestId, namespaceId, repositoryId },
  { integrations, db, entities },
) => {
  const namespace = await db.select().from(entities.namespaces).where(eq(entities.namespaces.id, namespaceId)).get();
  if (!namespace) throw new Error(`Invalid namespace: ${namespaceId}`);

  const repository = await db.select().from(entities.repositories).where(eq(entities.repositories.id, repositoryId)).get();
  if (!repository) throw new Error(`Invalid repository: ${repositoryId}`);

  const mergeRequest = await db.select().from(entities.mergeRequests).where(eq(entities.mergeRequests.id, mergeRequestId)).get();
  if (!mergeRequest) throw new Error(`Invalid mergeRequest: ${mergeRequestId}`);

  if (!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }

  const { timelineEvents } = await integrations.sourceControl.fetchTimelineEvents(repository, namespace, mergeRequest);

  const insertedTimelineEvents = await db.transaction(async (tx) => {
    return Promise.all(timelineEvents.map(event =>
      tx.insert(entities.timelineEvents).values(event)
        .onConflictDoUpdate({
          target: [entities.timelineEvents.external_id, entities.timelineEvents.mergeRequestId, entities.timelineEvents.type],
          set: {
            data: event.data,
            _updatedAt: sql`(strftime('%s', 'now'))`,
          }
        })
        .returning()
        .get()
    ));
  });

  return {
    timelineEvents: insertedTimelineEvents,
  };
}

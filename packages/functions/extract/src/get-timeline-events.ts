import type { CommittedEvent, Member, NewMember, TimelineEvents } from "@dxta/extract-schema";
import type { Entities, ExtractFunction } from "./config"
import type { SourceControl } from "@dxta/source-control";
import { eq, sql } from "drizzle-orm";

export type GetTimelineEventsInputs = {
  mergeRequestId: number;
  namespaceId: number;
  repositoryId: number;
}

export type GetTimelineEventsOutput = {
  timelineEvents: TimelineEvents[];
  members: Member[];
};

export type GetTimelineEventsSourceControl = Pick<SourceControl, "fetchTimelineEvents">;
export type GetTimelineEventsEntities = Pick<Entities, "namespaces" | "repositories" | "mergeRequests" | "timelineEvents" | "members" | "repositoriesToMembers" | "gitIdentities">;

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

  const nonCommitEvents = timelineEvents.filter(ev => ev.type !== "committed");

  const commitEvents = timelineEvents.filter(ev => ev.type === "committed");

  const committers = commitEvents.flatMap(ev => {
    const result = [];
    const { committerEmail, committerName } = ev.data as CommittedEvent; 
    result.push({ email: committerEmail, name: committerName });

    if(!!ev.actorEmail && ev.actorEmail !== committerEmail) {
      result.push({ email: ev.actorEmail, name: ev.actorName });
    }

    return result;
  });

  const insertedCommitters = await db.transaction(async (tx) => {
    return Promise.all(committers.map(committer =>
      tx.insert(entities.gitIdentities).values({
        name: committer.name,
        email: committer.email,
        repositoryId: repository.id,
      })
        .onConflictDoUpdate({
          target: [
            entities.gitIdentities.email,
            entities.gitIdentities.name,
            entities.gitIdentities.repositoryId,
          ],
          set: {
            name: committer.name,
            email: committer.email,
            _updatedAt: sql`(strftime('%s', 'now'))`,
          }
        })
        .returning()
        .get()
    ));
  });

  const uniqueTimelineActors = [...nonCommitEvents.reduce((externalIdToActor, event) =>
    event.actorId ? externalIdToActor.set(event.actorId, { // actorId is optional due to commit events
      externalId: event.actorId,
      username: event.actorName,
      forgeType: repository.forgeType,
      extractedSource: 'timeline',
    }) : externalIdToActor, new Map<number, NewMember>()).values()];

  const insertedUniqueTimelineActors = uniqueTimelineActors.length === 0 ? [] : await db.transaction(async (tx) => {
    return Promise.all(uniqueTimelineActors.map(actor =>
      tx.insert(entities.members).values(actor)
        .onConflictDoUpdate({
          target: [
            entities.members.externalId,
            entities.members.forgeType
          ],
          set: {
            username: actor.username,
            _updatedAt: sql`(strftime('%s', 'now'))`,
          },
        })
        .returning()
        .get()
    ));
  });

  if (insertedUniqueTimelineActors.length > 0) {
    await db.insert(entities.repositoriesToMembers)
      .values(insertedUniqueTimelineActors.map(member => ({ memberId: member.id, repositoryId })))
      .onConflictDoNothing()
      .run();
  }

  const insertedTimelineEvents = await db.transaction(async (tx) => {
    return Promise.all(timelineEvents.map(event =>
      tx.insert(entities.timelineEvents).values(event)
        .onConflictDoUpdate({
          target: [entities.timelineEvents.externalId, entities.timelineEvents.mergeRequestId, entities.timelineEvents.type],
          set: {
            data: event.data,
            timestamp: event.timestamp,
            actorEmail: event.actorEmail,
            actorName: event.actorName,
            _updatedAt: sql`(strftime('%s', 'now'))`,
          }
        })
        .returning()
        .get()
    ));
  });

  return {
    timelineEvents: insertedTimelineEvents,
    members: insertedUniqueTimelineActors,
    gitIdentities: insertedCommitters,
  };
}

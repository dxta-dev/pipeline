import * as extract from "@dxta/extract-schema";

export type MergeRequestCommitEventData = {
  type: "committed";
  timestamp: extract.MergeRequestCommit["authoredDate"];
  authoredAt: extract.MergeRequestCommit["authoredDate"];
  committedAt: extract.MergeRequestCommit["committedDate"];
  author: {
    externalId: extract.MergeRequestCommit["authorExternalId"];
    name: extract.MergeRequestCommit["authorName"];
    email: extract.MergeRequestCommit["authorEmail"];
  },
  committer: {
    externalId: extract.MergeRequestCommit["committerExternalId"];
    name: NonNullable<extract.MergeRequestCommit["committerName"]>;
    email: NonNullable<extract.MergeRequestCommit["committerEmail"]>;
  } | null
}

export const MergeRequestTimelineEventDataTypes = extract.TimelineEventTypes.filter(type => type !== "committed") as MergeRequestTimelineEventData["type"][];
export type MergeRequestTimelineEventData = {
  type: Exclude<extract.TimelineEventType, "committed">;
  timestamp: extract.TimelineEvents["timestamp"];
  actorExternalId: extract.TimelineEvents["actorId"];
  data: extract.TimelineEvents["data"];
}

export type MergeRequestNoteEventData = {
  type: "noted";
  timestamp: extract.MergeRequestNote["createdAt"];
  authorExternalId: extract.MergeRequestNote["authorExternalId"];
}

export type MergeRequestEventData = MergeRequestTimelineEventData | MergeRequestCommitEventData | MergeRequestNoteEventData;
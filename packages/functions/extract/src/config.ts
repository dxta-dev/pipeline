import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type { repositories, namespaces, mergeRequests, members, repositoriesToMembers, mergeRequestDiffs, mergeRequestCommits, mergeRequestNotes, timelineEvents } from '@acme/extract-schema';
import type { SourceControl } from '@acme/source-control';


export type Database = LibSQLDatabase<Record<string, unknown>>;

export type Entities = {
  repositories: typeof repositories;
  namespaces: typeof namespaces;
  mergeRequests: typeof mergeRequests;
  mergeRequestDiffs: typeof mergeRequestDiffs;
  members: typeof members;
  repositoriesToMembers: typeof repositoriesToMembers;
  mergeRequestCommits: typeof mergeRequestCommits;
  mergeRequestNotes: typeof mergeRequestNotes;
  timelineEvents: typeof timelineEvents;
};

export type Context<SC extends Partial<SourceControl>, E extends Partial<Entities>> = {
  integrations: {
    sourceControl: SC | null;
  };
  db: Database;
  entities: E;
};

export type Input = Record<string, unknown>;

export type ExtractFunction<I extends Input, O, SC extends Partial<SourceControl>, E extends Partial<Entities>> = (input: I, context: Context<SC, E>) => Promise<O>;

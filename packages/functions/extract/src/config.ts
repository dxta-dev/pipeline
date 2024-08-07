import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type { repositories, namespaces, gitIdentities, mergeRequests, members, repositoriesToMembers, mergeRequestDiffs, mergeRequestCommits, mergeRequestNotes, timelineEvents, cicdWorkflows, cicdRuns, repositoryCommits, repositoryCommitsChildren } from '@dxta/extract-schema';
import type { SourceControl } from '@dxta/source-control';

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
  gitIdentities: typeof gitIdentities;
  cicdWorkflows: typeof cicdWorkflows;
  cicdRuns: typeof cicdRuns;
  commits: typeof repositoryCommits;
  commitsChildren: typeof repositoryCommitsChildren;
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

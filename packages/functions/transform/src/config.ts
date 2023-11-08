import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type * as extract from '@acme/extract-schema';
import type * as transform from '@acme/transform-schema';

export type Database = LibSQLDatabase<Record<string, unknown>>;

export type ExtractEntities = {
  repositories: typeof extract.repositories;
  namespaces: typeof extract.namespaces;
  mergeRequests: typeof extract.mergeRequests;
  mergeRequestDiffs: typeof extract.mergeRequestDiffs;
  members: typeof extract.members;
  repositoriesToMembers: typeof extract.repositoriesToMembers;
  mergeRequestCommits: typeof extract.mergeRequestCommits;
  mergeRequestNotes: typeof extract.mergeRequestNotes;
  timelineEvents: typeof extract.timelineEvents;
};

export type TransformEntities = {
  forgeUsers: typeof transform.forgeUsers;
  mergeRequests: typeof transform.mergeRequests;
  repositories: typeof transform.repositories;
  dates: typeof transform.dates;
  mergeRequestMetrics: typeof transform.mergeRequestMetrics;
  mergeRequestDatesJunk: typeof transform.mergeRequestDatesJunk;
}

export type Context<EE extends Partial<ExtractEntities>, TE extends Partial<TransformEntities>> = {
  extract: {
    db: Database;
    entities: EE;
  },
  transform: {
    db: Database;
    entities: TE;
  }
}

export type Input = Record<string, unknown>;
export type TransformFunction<I extends Input, O, EE extends Partial<ExtractEntities>, TE extends Partial<TransformEntities>> = (input: I, context: Context<EE, TE>) => Promise<O>;

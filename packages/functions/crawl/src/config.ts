import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type { instances, events } from '@acme/crawl-schema';

export type Entities = {
  instances: typeof instances;
  events: typeof events;
};

export type Context<E extends Partial<Entities>> = {
  db: LibSQLDatabase;
  entities: E;
};

export type Input = Record<string, unknown>;

export type CrawlFunction<I extends Input, O, E extends Partial<Entities>> = (input: I, context: Context<E>) => Promise<O>;

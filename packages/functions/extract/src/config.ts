import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type { repositories, namespaces } from '@acme/extract-schema';
import type { NewNamespace, NewRepository} from '@acme/extract-schema';

export type Database = BetterSQLite3Database | LibSQLDatabase;

export interface SourceControl {
  getRepo(externalRepositoryId: number): Promise<{ repository: NewRepository, namespace?: NewNamespace }>;
}

export type Context = {
  integrations: {
    sourceControl: SourceControl;
  };
  db: Database;
  entities: {
    repositories: typeof repositories,
    namespaces: typeof namespaces,
  };
};

export type Input = Record<string, unknown>;

export type ExtractFunction<I extends Input, O> = (input: I, context: Context) => Promise<O>;

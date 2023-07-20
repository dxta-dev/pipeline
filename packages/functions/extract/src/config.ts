import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type { projects, namespaces } from '@acme/extract-schema';
import type { Project, Namespace } from '@acme/extract-schema';

export type Database = BetterSQLite3Database | LibSQLDatabase;

export interface SourceControl {
  getProject(externalProjectId: number): Promise<{ project: Project, namespace?: Namespace }>;
}

export type Context = {
  api: {
    git: SourceControl;
  };
  db: Database;
  entities: {
    projects: typeof projects,
    namespaces: typeof namespaces,
  };
};

export type Input = Record<string, unknown>;

export type ExtractFunction<T> = (input: Input, context: Context) => Promise<T>;

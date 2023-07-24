import { describe, expect, test } from '@jest/globals';
import { unlink } from 'fs/promises';
import { getRepository } from './get-repository';

import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import Database from "better-sqlite3";
import { namespaces, repositories } from '@acme/extract-schema';
import type { NewNamespace, NewRepository } from '@acme/extract-schema';
import type { Context } from './config';

let betterSqlite: ReturnType<typeof Database>;
let db: ReturnType<typeof drizzle>;
let context: Context;
let fetchRepository: jest.Mock<Promise<{
  repository: NewRepository,
  namespace: NewNamespace
}>>

beforeAll(() => {
  betterSqlite = new Database("test.db");
  db = drizzle(betterSqlite);

  migrate(db, { migrationsFolder: "../../../migrations/extract" });

  fetchRepository = jest.fn((externalRepositoryId: number) => {
    switch (externalRepositoryId) {
      case 1000:
        return Promise.resolve({
          repository: { externalId: 1000 },
          namespace: { externalId: 2000, name: 'gengar' }
        });
      default:
        return Promise.reject(new Error('Are you mocking me?'));
    }
  });

  context = {
    entities: { namespaces, repositories },
    integrations: {
      sourceControl: {
        fetchRepository
      }
    },
    db
  }

});

afterAll(async () => {
  betterSqlite.close();
  await unlink('test.db');
});

describe('get-repository', () => {
  test('should insert values into db', async () => {
    const { namespace, repository } = await getRepository({ externalRepositoryId: 1000 }, context);

    expect(namespace).not.toBeNull();
    expect(repository).toBeDefined();
    expect(fetchRepository).toHaveBeenCalledTimes(1);

    const repositoryRow = db.select().from(repositories)
      .where(eq(repositories.externalId, repository.externalId)).get();
    expect(repositoryRow.externalId).toEqual(repository.externalId);
    expect(repositoryRow.id).toBeDefined();

    if (!namespace) {
      throw new Error('namespace should not be null');
    }

    const namespaceRow = db.select().from(namespaces)
      .where(eq(namespaces.externalId, namespace.externalId)).get();
    expect(namespaceRow.externalId).toEqual(namespace.externalId);
    expect(namespaceRow.id).toBeDefined();

  });
});

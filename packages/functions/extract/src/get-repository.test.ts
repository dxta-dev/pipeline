import { describe, expect, test } from '@jest/globals';
import { getRepository } from './get-repository';

import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import Database from "better-sqlite3";
import { namespaces, repositories } from '@acme/extract-schema';
import type { NewNamespace, NewRepository } from '@acme/extract-schema';
import type { Context } from './config';
import type { GetRepositorySourceControl, GetRepositoryEntities } from './get-repository';

let betterSqlite: ReturnType<typeof Database>;
let db: ReturnType<typeof drizzle>;
let context: Context<GetRepositorySourceControl, GetRepositoryEntities>;
let fetchRepository: jest.Mock<Promise<{
  repository: NewRepository,
  namespace: NewNamespace
}>>

beforeAll(() => {
  betterSqlite = new Database(':memory:');
  db = drizzle(betterSqlite);

  migrate(db, { migrationsFolder: "../../../migrations/extract" });

  fetchRepository = jest.fn((externalRepositoryId: number) => {
    switch (externalRepositoryId) {
      case 1000:
        return Promise.resolve({
          repository: { externalId: 1000, name: 'repo' },
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

afterAll(() => {
  betterSqlite.close();
});

describe('get-repository', () => {
  describe('getRepository', () => {
    test('should insert values into db', async () => {
      const { namespace, repository } = await getRepository({ externalRepositoryId: 1000, namespaceName: '', repositoryName: '' }, context);

      expect(namespace).toBeDefined();
      expect(repository).toBeDefined();
      expect(fetchRepository).toHaveBeenCalledTimes(1);

      const repositoryRow = db.select().from(repositories)
        .where(eq(repositories.externalId, repository.externalId)).get();

      expect(repositoryRow).toBeDefined();
      expect(repositoryRow?.externalId).toEqual(repository.externalId);
      expect(repositoryRow?.id).toEqual(repository.id);

      const namespaceRow = db.select().from(namespaces)
        .where(eq(namespaces.externalId, namespace.externalId)).get();
        
      expect(namespaceRow).toBeDefined();
      expect(namespaceRow?.externalId).toEqual(namespace.externalId);
      expect(namespaceRow?.id).toEqual(namespace.id);
    });
  });
});

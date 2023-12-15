import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from '@libsql/client';

import { describe, expect, test } from '@jest/globals';
import { getRepository } from './get-repository';

import { eq } from "drizzle-orm";
import { namespaces, repositories } from '@acme/extract-schema';
import type { NewNamespace, NewRepository } from '@acme/extract-schema';
import type { Context } from './config';
import type { GetRepositorySourceControl, GetRepositoryEntities } from './get-repository';
import fs from 'fs';

let sqlite: ReturnType<typeof createClient>;
let db: ReturnType<typeof drizzle>;
let context: Context<GetRepositorySourceControl, GetRepositoryEntities>;
let fetchRepository: jest.Mock<Promise<{
  repository: Omit<NewRepository, 'namespaceId'>,
  namespace: NewNamespace
}>>

const dbname = 'get-repository';

beforeAll(async () => {
  sqlite = createClient({
    url: `file:${dbname}`,
  });
  db = drizzle(sqlite);

  await migrate(db, { migrationsFolder: "../../../migrations/tenant-db" });

  fetchRepository = jest.fn((externalRepositoryId: number) => {
    switch (externalRepositoryId) {
      case 1000:
        return Promise.resolve({
          repository: { externalId: 1000, name: 'repo', forgeType: 'github' },
          namespace: { externalId: 2000, name: 'gengar', forgeType: 'github' }
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
  sqlite.close();
  fs.unlinkSync(dbname);
});

describe('get-repository', () => {
  describe('getRepository', () => {
    test('should insert values into db', async () => {
      const { namespace, repository } = await getRepository({ externalRepositoryId: 1000, namespaceName: '', repositoryName: '' }, context);

      expect(namespace).toBeDefined();
      expect(repository).toBeDefined();
      expect(fetchRepository).toHaveBeenCalledTimes(1);

      const namespaceRow = await db.select().from(namespaces)
        .where(eq(namespaces.externalId, namespace.externalId)).get();

      expect(namespaceRow).toBeDefined();
      expect(namespaceRow?.externalId).toEqual(namespace.externalId);
      expect(namespaceRow?.id).toEqual(namespace.id);

      const repositoryRow = await db.select().from(repositories)
        .where(eq(repositories.externalId, repository.externalId)).get();

      expect(repositoryRow).toBeDefined();
      expect(repositoryRow?.externalId).toEqual(repository.externalId);
      expect(repositoryRow?.id).toEqual(repository.id);
      expect(repositoryRow?.namespaceId).toEqual(namespace.id);

    });
  });
});

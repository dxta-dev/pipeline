
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from '@libsql/client';

import { describe, expect, test } from '@jest/globals';
import { getDeployments } from './get-deployments';

import { type NewRepository, deployments, type NewDeployment, repositories, type NewNamespace, namespaces } from '@dxta/extract-schema';
import type { Context } from './config';
import type { GetDeploymentsSourceControl, GetDeploymentsEntities } from './get-deployments';
import type { SourceControl } from '@dxta/source-control';
import fs from 'fs';

let sqlite: ReturnType<typeof createClient>;
let db: ReturnType<typeof drizzle>;
let context: Context<GetDeploymentsSourceControl, GetDeploymentsEntities>;
let fetchDeployments: SourceControl['fetchDeployments'];

const TEST_NAMESPACE = { id: 1, externalId: 2000, name: 'TEST_NAMESPACE_NAME', forgeType: 'github' } satisfies NewNamespace;
const TEST_REPO = { id: 1, externalId: 1000, name: 'TEST_REPO_NAME', forgeType: 'github', namespaceId: 1 } satisfies NewRepository;

const dbname = "get-deployments";

beforeAll(async () => {
  sqlite = createClient({
    url: `file:${dbname}`,
  });
  db = drizzle(sqlite);

  await migrate(db, { migrationsFolder: "../../../migrations/combined" });
  await db.insert(namespaces).values(TEST_NAMESPACE).run();
  await db.insert(repositories).values(TEST_REPO).run();

  fetchDeployments = jest.fn((externalRepositoryId, namespaceName, repositoryName, repositoryId, perPage: number, page?: number) => {
    switch (externalRepositoryId) {
      case 1000:
        return Promise.resolve({
          deployments: [
            { externalId: 1000, env: 'prod', ref: 'main', sha: 'a0a22a47f37cc87df7627bf0db7737d1fc7f9ff6', isMarkedAsProd: true, createdAt: new Date(), updatedAt: new Date(), repositoryId: 1 }
          ],
          pagination: {
            page: page || 1,
            perPage,
            totalPages: 1,
          }
        }) satisfies ReturnType<SourceControl['fetchDeployments']>;
      default:
        return Promise.reject(new Error("Are you mocking me?"))
    }
  });

  context = {
    entities: { deployments },
    db,
    integrations: {
      sourceControl: {
        fetchDeployments
      }
    }
  };

});

afterAll(() => {
  sqlite.close();
  fs.unlinkSync(dbname);
});

describe('get-deployments:', () => {
  describe('getDeployments', () => {
    test('should insert deployment data in the database', async () => {
      const { deployments, paginationInfo } = await getDeployments({
        externalRepositoryId: 1000,
        namespaceName: '',
        repositoryName: '',
        repositoryId: 1,
        perPage: 1000
      }, context);

      expect(deployments).toBeDefined();
      expect(paginationInfo).toBeDefined();
      expect(fetchDeployments).toHaveBeenCalledTimes(1);

      const deploymentRows = await db.select().from(context.entities.deployments).all();
      expect(deploymentRows.length).toEqual(deployments.length);

      for (const deploymentRow of deploymentRows) {
        const rowMatchedMember = deployments.find((m) => m.externalId === deploymentRow.externalId);
        expect(rowMatchedMember).toBeDefined();
        if (!rowMatchedMember) return;
        expect(rowMatchedMember.id).toEqual(deploymentRow.id);
      }
    });
  });
});

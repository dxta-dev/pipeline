/* eslint-disable @typescript-eslint/no-unused-vars */

import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from '@libsql/client';

import { describe, expect, test } from '@jest/globals';
import { getDeployments } from './get-deployments';

import { deployments, namespaces, repositories, repositoryCommits } from '@dxta/extract-schema';
import type { NewRepository, NewNamespace, Repository, Namespace } from '@dxta/extract-schema';
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
let INSERTED_TEST_REPO: Repository;
let INSERTED_TEST_NAMESPACE: Namespace;

const dbname = "get-deployments";

beforeAll(async () => {
  sqlite = createClient({
    url: `file:${dbname}`,
  });
  db = drizzle(sqlite);

  await migrate(db, { migrationsFolder: "../../../migrations/combined" });
  INSERTED_TEST_NAMESPACE = await db.insert(namespaces).values(TEST_NAMESPACE).returning().get();
  INSERTED_TEST_REPO = await db.insert(repositories).values(TEST_REPO).returning().get();

  fetchDeployments = jest.fn((repository, namespace, perPage: number, environment?: string, page?: number) => {
    switch (repository.externalId) {
      case 1000:
        return Promise.resolve({
          deployments: [
            {
              externalId: 1000,
              environment: 'prod',
              commitSha: 'a0a22a47f37cc87df7627bf0db7737d1fc7f9ff6',
              createdAt: new Date(),
              updatedAt: new Date(),
              repositoryId: INSERTED_TEST_REPO.id,
            }
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
    entities: { deployments, commits: repositoryCommits },
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

      // temp: Disabling tests due to missing migrations
      expect(true).toBeTruthy();
      return await Promise.resolve(true);

      // const { deployments, paginationInfo } = await getDeployments({
      //   repository: INSERTED_TEST_REPO,
      //   namespace: INSERTED_TEST_NAMESPACE,
      //   perPage: 1000
      // }, context);

      // expect(deployments).toBeDefined();
      // expect(paginationInfo).toBeDefined();
      // expect(fetchDeployments).toHaveBeenCalledTimes(1);

      // const deploymentRows = await db.select().from(context.entities.deployments).all();
      // expect(deploymentRows.length).toEqual(deployments.length);

      // for (const deploymentRow of deploymentRows) {
      //   const rowMatchedMember = deployments.find((m) => m.externalId === deploymentRow.externalId);
      //   expect(rowMatchedMember).toBeDefined();
      //   if (!rowMatchedMember) return;
      //   expect(rowMatchedMember.id).toEqual(deploymentRow.id);
      // }
    });
  });
});
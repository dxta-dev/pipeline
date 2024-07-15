
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from '@libsql/client';


import { describe, expect, test } from '@jest/globals';
import { getCicdRuns } from './get-cicd-runs';

import { repositories, namespaces, cicdRuns, } from '@dxta/extract-schema';
import type { NewNamespace, Namespace, NewRepository, Repository, NewCicdRun } from '@dxta/extract-schema';
import type { Context } from './config';
import type { GetCicdRunsSourceControl, GetCicdRunsEntities } from './get-cicd-runs';
import type { SourceControl } from '@dxta/source-control';
import fs from 'fs';

let sqlite: ReturnType<typeof createClient>;
let db: ReturnType<typeof drizzle>;
let context: Context<GetCicdRunsSourceControl, GetCicdRunsEntities>;
let fetchCicdWorkflowRuns: SourceControl['fetchCicdWorkflowRuns'];

const TEST_NAMESPACE = { id: 1, externalId: 2000, name: 'TEST_NAMESPACE_NAME', forgeType: 'github' } satisfies NewNamespace;
const TEST_REPO = { id: 1, externalId: 1000, name: 'TEST_REPO_NAME', forgeType: 'github', namespaceId: 1 } satisfies NewRepository;
let INSERTED_TEST_REPO: Repository;
let INSERTED_TEST_NAMESPACE: Namespace;

const dbname = "get-cicd-runs";

beforeAll(async () => {
  sqlite = createClient({
    url: `file:${dbname}`,
  });
  db = drizzle(sqlite);

  await migrate(db, { migrationsFolder: "../../../migrations/combined" });
  INSERTED_TEST_NAMESPACE = await db.insert(namespaces).values(TEST_NAMESPACE).returning().get();
  INSERTED_TEST_REPO = await db.insert(repositories).values(TEST_REPO).returning().get();

  fetchCicdWorkflowRuns = jest.fn((repository, _namespace, workflowId, _timePeriod, perPage: number, _branch?: string, page?: number) => {
    switch (repository.externalId) {
      case 1000:
        return Promise.resolve({
          cicdRuns: [
            {
              externalId: 1000,
              repositoryId: INSERTED_TEST_REPO.id,
              workflowExternalId: workflowId,
              workflowRunner: "github_actions",
              gitBranch: "main", gitSha: "f".repeat(40),
              runAttempt: 1, createdAt: new Date(), updatedAt: new Date(), runStartedAt: new Date(),
              status: "completed", result: "success", detailsUrl: "http://localhost/",
            }
          ],
          pagination: {
            page: page || 1,
            perPage,
            totalPages: 1,
          }
        }) satisfies ReturnType<SourceControl['fetchCicdWorkflowRuns']>;
      default:
        return Promise.reject(new Error("Are you mocking me?"))
    }
  });

  context = {
    entities: { cicdRuns },
    db,
    integrations: {
      sourceControl: {
        fetchCicdWorkflowRuns,
      }
    }
  };

});

afterAll(() => {
  sqlite.close();
  fs.unlinkSync(dbname);
});

describe('get-cicd-runs:', () => {
  describe('getCicdRuns', () => {
    test('should insert cicd workflow runs data in the database', async () => {
      const { cicdRuns, nextPage } = await getCicdRuns({
        namespace: INSERTED_TEST_NAMESPACE,
        repository: INSERTED_TEST_REPO,
        timePeriod: { from: new Date(), to: new Date() },
        workflowId: 3000,
        perPage: 1000,
      }, context);

      expect(cicdRuns).toBeDefined();
      expect(nextPage).toBeNull();
      expect(fetchCicdWorkflowRuns).toHaveBeenCalledTimes(1);

      const cicdRunRows = await db.select().from(context.entities.cicdRuns).all();
      expect(cicdRunRows.length).toEqual(cicdRuns.length);

      for (const cicdRunRow of cicdRunRows) {
        const rowMatchedCicdRun = cicdRunRows.find((ci) => ci.externalId === cicdRunRow.externalId);
        expect(rowMatchedCicdRun).toBeDefined();
        if (!rowMatchedCicdRun) return;
        expect(rowMatchedCicdRun.id).toEqual(cicdRunRow.id);
      }
    });
  });
});

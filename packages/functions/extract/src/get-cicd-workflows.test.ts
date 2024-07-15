
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from '@libsql/client';


import { describe, expect, test } from '@jest/globals';
import { getCicdWorkflows } from './get-cicd-workflows';

import { type NewRepository, repositories, type NewNamespace, namespaces, cicdWorkflows, Repository, Namespace } from '@dxta/extract-schema';
import type { Context } from './config';
import type { GetCicdWorkflowsSourceControl, GetCicdWorkflowsEntities } from './get-cicd-workflows';
import type { SourceControl } from '@dxta/source-control';
import fs from 'fs';

let sqlite: ReturnType<typeof createClient>;
let db: ReturnType<typeof drizzle>;
let context: Context<GetCicdWorkflowsSourceControl, GetCicdWorkflowsEntities>;
let fetchCicdWorkflows: SourceControl['fetchCicdWorkflows'];

const TEST_NAMESPACE = { id: 1, externalId: 2000, name: 'TEST_NAMESPACE_NAME', forgeType: 'github' } satisfies NewNamespace;
const TEST_REPO = { id: 1, externalId: 1000, name: 'TEST_REPO_NAME', forgeType: 'github', namespaceId: 1 } satisfies NewRepository;
let INSERTED_TEST_REPO: Repository;
let INSERTED_TEST_NAMESPACE: Namespace;

const dbname = "get-cicd-workflows";

beforeAll(async () => {
  sqlite = createClient({
    url: `file:${dbname}`,
  });
  db = drizzle(sqlite);

  await migrate(db, { migrationsFolder: "../../../migrations/combined" });
  INSERTED_TEST_NAMESPACE = await db.insert(namespaces).values(TEST_NAMESPACE).returning().get();
  INSERTED_TEST_REPO = await db.insert(repositories).values(TEST_REPO).returning().get();

  fetchCicdWorkflows = jest.fn((repository, _namespace, perPage: number, page?: number) => {
    switch (repository.externalId) {
      case 1000:
        return Promise.resolve({
          cicdWorkflows: [
            { externalId: 1000, name: "ci", repositoryId: repository.id, runner: 'github_actions', sourcePath: "/dev/null" }
          ],
          pagination: {
            page: page || 1,
            perPage,
            totalPages: 1,
          }
        }) satisfies ReturnType<SourceControl['fetchCicdWorkflows']>;
      default:
        return Promise.reject(new Error("Are you mocking me?"))
    }
  });

  context = {
    entities: { cicdWorkflows },
    db,
    integrations: {
      sourceControl: {
        fetchCicdWorkflows
      }
    }
  };

});

afterAll(() => {
  sqlite.close();
  fs.unlinkSync(dbname);
});

describe('get-cicd-workflows:', () => {
  describe('getCicdWorkflows', () => {
    test('should insert cicd workflow data in the database', async () => {
      const { cicdWorkflows, paginationInfo } = await getCicdWorkflows({
        namespace: INSERTED_TEST_NAMESPACE,
        repository: INSERTED_TEST_REPO,
        perPage: 1000,
      }, context);

      expect(cicdWorkflows).toBeDefined();
      expect(paginationInfo).toBeDefined();
      expect(fetchCicdWorkflows).toHaveBeenCalledTimes(1);

      const cicdWorkflowRows = await db.select().from(context.entities.cicdWorkflows).all();
      expect(cicdWorkflowRows.length).toEqual(cicdWorkflows.length);

      for (const cicdWorkflowRow of cicdWorkflowRows) {
        const rowMatchedCicdWorkflow = cicdWorkflowRows.find((ci) => ci.externalId === cicdWorkflowRow.externalId);
        expect(rowMatchedCicdWorkflow).toBeDefined();
        if (!rowMatchedCicdWorkflow) return;
        expect(rowMatchedCicdWorkflow.id).toEqual(cicdWorkflowRow.id);
      }
    });
  });
});

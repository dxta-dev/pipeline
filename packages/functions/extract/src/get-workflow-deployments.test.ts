
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from '@libsql/client';


import { describe, expect, test } from '@jest/globals';
import { getWorkflowDeployments } from './get-workflow-deployments';

import { repositories, namespaces, deployments, repositoryShas } from '@dxta/extract-schema';
import type { NewNamespace, Namespace, NewRepository, Repository } from '@dxta/extract-schema';
import type { Context } from './config';
import type { GetWorkflowDeploymentsSourceControl, GetWorkflowDeploymentsEntities } from './get-workflow-deployments';
import type { SourceControl } from '@dxta/source-control';
import fs from 'fs';

let sqlite: ReturnType<typeof createClient>;
let db: ReturnType<typeof drizzle>;
let context: Context<GetWorkflowDeploymentsSourceControl, GetWorkflowDeploymentsEntities>;
let fetchWorkflowDeployments: SourceControl['fetchWorkflowDeployments'];

const TEST_NAMESPACE = { id: 1, externalId: 2000, name: 'TEST_NAMESPACE_NAME', forgeType: 'github' } satisfies NewNamespace;
const TEST_REPO = { id: 1, externalId: 1000, name: 'TEST_REPO_NAME', forgeType: 'github', namespaceId: 1 } satisfies NewRepository;
let INSERTED_TEST_REPO: Repository;
let INSERTED_TEST_NAMESPACE: Namespace;

const dbname = "get-workflow-deployments";

beforeAll(async () => {
  sqlite = createClient({
    url: `file:${dbname}`,
  });
  db = drizzle(sqlite);

  await migrate(db, { migrationsFolder: "../../../migrations/combined" });
  INSERTED_TEST_NAMESPACE = await db.insert(namespaces).values(TEST_NAMESPACE).returning().get();
  INSERTED_TEST_REPO = await db.insert(repositories).values(TEST_REPO).returning().get();

  fetchWorkflowDeployments = jest.fn((repository, _namespace, workflowId, _timePeriod, perPage: number, _branch?: string, page?: number) => {
    switch (repository.externalId) {
      case 1000:
        return Promise.resolve({
          deployments: [
            {
              externalId: 1000,
              deploymentType: 'github-workflow-deployment',
              repositoryId: INSERTED_TEST_REPO.id,
              commitSha: "f".repeat(40),            
              gitBranch: "main", 
              runAttempt: 1, createdAt: new Date(), updatedAt: new Date(), runStartedAt: new Date(),
              status: "success", deployedAt: new Date()
            }
          ],
          pagination: {
            page: page || 1,
            perPage,
            totalPages: 1,
          }
        }) satisfies ReturnType<SourceControl['fetchWorkflowDeployments']>;
      default:
        return Promise.reject(new Error("Are you mocking me?"))
    }
  });

  context = {
    entities: { deployments, repositoryShas },
    db,
    integrations: {
      sourceControl: {
        fetchWorkflowDeployments,
      }
    }
  };

});

afterAll(() => {
  sqlite.close();
  fs.unlinkSync(dbname);
});

describe('get-workflow-deployments:', () => {
  describe('getWorkflowDeployments', () => {
    test('should insert workflow deployment data in the database', async () => {
      const { deployments, paginationInfo } = await getWorkflowDeployments({
        namespace: INSERTED_TEST_NAMESPACE,
        repository: INSERTED_TEST_REPO,
        timePeriod: { from: new Date(), to: new Date() },
        workflowId: 3000,
        perPage: 1000,
      }, context);

      expect(deployments).toBeDefined();
      expect(paginationInfo).toBeDefined();
      expect(fetchWorkflowDeployments).toHaveBeenCalledTimes(1);

      const workflowDeploymentRows = await db.select().from(context.entities.deployments).all();
      expect(workflowDeploymentRows.length).toEqual(deployments.length);

      for (const workflowDeploymentRow of workflowDeploymentRows) {
        const rowMatchedWorkflowDeployment = workflowDeploymentRows.find((ci) => ci.externalId === workflowDeploymentRow.externalId);
        expect(rowMatchedWorkflowDeployment).toBeDefined();
        if (!rowMatchedWorkflowDeployment) return;
        expect(rowMatchedWorkflowDeployment.id).toEqual(workflowDeploymentRow.id);
      }
    });
  });
});

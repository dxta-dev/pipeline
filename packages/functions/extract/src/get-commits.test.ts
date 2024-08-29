import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from '@libsql/client';

import { describe, expect, test } from '@jest/globals';
import { getCommits } from './get-commits';

import { repositories, namespaces, repositoryCommits as commits, repositoryShaTrees, repositoryShas } from '@dxta/extract-schema';
import type { NewNamespace, Namespace, NewRepository, Repository } from '@dxta/extract-schema';
import type { Context } from './config';
import type { GetCommitsSourceControl, GetCommitsEntities } from './get-commits';
import type { SourceControl, TimePeriod, } from '@dxta/source-control';
import fs from 'fs';

let sqlite: ReturnType<typeof createClient>;
let db: ReturnType<typeof drizzle>;
let context: Context<GetCommitsSourceControl, GetCommitsEntities>;
let fetchCommits: SourceControl['fetchCommits'];

const TEST_NAMESPACE = { id: 1, externalId: 2000, name: 'TEST_NAMESPACE_NAME', forgeType: 'github' } satisfies NewNamespace;
const TEST_REPO = { id: 1, externalId: 1000, name: 'TEST_REPO_NAME', forgeType: 'github', namespaceId: 1 } satisfies NewRepository;
let INSERTED_TEST_REPO: Repository;
let INSERTED_TEST_NAMESPACE: Namespace;

const dbname = "get-commits";

beforeAll(async () => {
  sqlite = createClient({
    url: `file:${dbname}`,
  });
  db = drizzle(sqlite);

  await migrate(db, { migrationsFolder: "../../../migrations/combined" });
  INSERTED_TEST_NAMESPACE = await db.insert(namespaces).values(TEST_NAMESPACE).returning().get();
  INSERTED_TEST_REPO = await db.insert(repositories).values(TEST_REPO).returning().get();

  fetchCommits = jest.fn((repository, _namespace, perPage: number, _ref?: string, _period?: TimePeriod, page?: number) => {
    switch (repository.externalId) {
      case 1000:
        return Promise.resolve({
          commits: [
            {              
              commit: {},
              id: "795ff655bb9ff2cbb2a91ac2cff93d2dbcd7b431",
              parents: ["0a5c4d39f30d0df02ec71b45824a6b3ca0d772de"],
            },
            {
              commit: {},
              id: "0a5c4d39f30d0df02ec71b45824a6b3ca0d772de",
              parents: ["dccbf499443e34ab0c461be770470aaebfe5536e"],
            }
          ],
          pagination: {
            page: page || 1,
            perPage,
            totalPages: 1,
          }
        }) satisfies ReturnType<SourceControl['fetchCommits']>;
      default:
        return Promise.reject(new Error("Are you mocking me?"))
    }
  });

  context = {
    entities: { commits, repositoryShaTrees, repositoryShas },
    db,
    integrations: {
      sourceControl: {
        fetchCommits
      }
    }
  };

});

afterAll(() => {
  sqlite.close();
  fs.unlinkSync(dbname);
});

describe('get-commits:', () => {
  describe('getCommits', () => {
    test('should insert commit data in the database', async () => {
      const { commits, paginationInfo } = await getCommits({
        namespace: INSERTED_TEST_NAMESPACE,
        repository: INSERTED_TEST_REPO,
        perPage: 1000,
      }, context);

      expect(commits).toBeDefined();
      expect(paginationInfo).toBeDefined();
      expect(fetchCommits).toHaveBeenCalledTimes(1);

      const commitRows = await db.select().from(context.entities.commits).all();
      const shaTreesRows = await db.select().from(context.entities.repositoryShaTrees).all();
      expect(commitRows.length).toEqual(commits.length);
      expect(commitRows.length).toEqual(shaTreesRows.length + 1); // + 1 because last commit parent isn't caught with the fetch (hypothetical case)

      for (const commitRow of commitRows) {
        const rowMatchedCommit = commits.find((commit) => commit.repositoryShaId === commitRow.repositoryShaId);
        expect(rowMatchedCommit).toBeDefined();
        if (!rowMatchedCommit) return;
        expect(rowMatchedCommit.id).toEqual(commitRow.id);
      }
    });
  });
});


import { describe, expect, test } from '@jest/globals';
import { unlink } from 'fs/promises';
import { getMergeRequestsDiffs } from './get-merge-request-diffs';

import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import { mergeRequestDiffs, mergeRequests, namespaces, repositories } from "@acme/extract-schema";
import type { MergeRequest, Namespace, NewMergeRequest, NewNamespace, NewRepository, Repository } from "@acme/extract-schema";
import type { Context } from './config';
import type { GetMergeRequestDiffsSourceControl, GetMergeRequestDiffsEntities } from './get-merge-request-diffs';

let betterSqlite: ReturnType<typeof Database>;
const databaseName = 'get-merge-request-diffs.db';
let db: ReturnType<typeof drizzle>;
let context: Context<GetMergeRequestDiffsSourceControl, GetMergeRequestDiffsEntities>;
let fetchMergeRequestDiffs: jest.MockedFunction<GetMergeRequestDiffsSourceControl['fetchMergeRequestDiffs']>;

const TEST_REPO_1 = { id: 1, externalId: 1000, name: 'TEST_REPO_NAME' } satisfies NewRepository;
const TEST_NAMESPACE_1 = { id: 1, externalId: 2000, name: 'TEST_NAMESPACE_NAME' } satisfies NewNamespace;
const TEST_MERGE_REQUEST_1 = { id: 1, externalId: 3000, createdAt: new Date(), mergeRequestId: 1, repositoryId: 1, title: "TEST_MR", webUrl: "localhost" } satisfies NewMergeRequest;

beforeAll(() => {
  betterSqlite = new Database(databaseName);
  db = drizzle(betterSqlite);

  migrate(db, { migrationsFolder: "../../../migrations/extract" });
  db.insert(repositories).values([TEST_REPO_1]).run();
  db.insert(namespaces).values([TEST_NAMESPACE_1]).run();
  db.insert(mergeRequests).values([TEST_MERGE_REQUEST_1]).run();

  fetchMergeRequestDiffs = jest.fn((repository: Repository, namespace: Namespace, mergeRequest: MergeRequest, page?: number, perPage?: number): ReturnType<GetMergeRequestDiffsSourceControl['fetchMergeRequestDiffs']> => {
    switch (mergeRequest.externalId) {
      case 3000:
        return Promise.resolve({
          mergeRequestDiffs: [
            {
              mergeRequestId: mergeRequest.id,
              diff: "",
              newPath: "file1",
              oldPath: "file1",
              aMode: "",
              bMode: "",
              newFile: true,
              renamedFile: false,
              deletedFile: false,
            },
            {
              mergeRequestId: mergeRequest.id,
              diff: "",
              newPath: "file2",
              oldPath: "file2",
              aMode: "",
              bMode: "",
              newFile: true,
              renamedFile: false,
              deletedFile: false,
            },
          ],
          pagination: {
            page: page || 1,
            perPage: perPage || 40,
            totalPages: 1
          }
        });
      default:
        return Promise.reject(new Error('Are you mocking me?'));
    }
  });

  context = {
    db,
    entities: {
      mergeRequestDiffs,
      mergeRequests,
      namespaces,
      repositories
    },
    integrations: {
      sourceControl: { fetchMergeRequestDiffs }
    }
  }
});

afterAll(async () => {
  betterSqlite.close();
  await unlink(databaseName);
});

describe('get-merge-request-diffs:', () => {
  describe('getMergeRequestDiffs', () => {
    test('should insert merge request diff data in the db', async () => {
      const { mergeRequestDiffs, paginationInfo } = await getMergeRequestsDiffs({
        mergeRequestId: TEST_MERGE_REQUEST_1.id,
        namespaceId: TEST_NAMESPACE_1.id,
        repositoryId: TEST_REPO_1.id,
      }, context);

      expect(mergeRequestDiffs).toBeDefined();
      expect(paginationInfo).toBeDefined();
      expect(fetchMergeRequestDiffs).toHaveBeenCalledTimes(1);

      const mergeRequestDiffRows = db.select().from(context.entities.mergeRequestDiffs).all();
      expect(mergeRequestDiffRows).toHaveLength(2);

      for (const mergeRequestDiffRow of mergeRequestDiffRows) {
        const extractedMergeRequestDiff = mergeRequestDiffs.find((mergeRequestDiff) =>
          mergeRequestDiff.mergeRequestId === mergeRequestDiffRow.mergeRequestId &&
          mergeRequestDiff.newPath === mergeRequestDiffRow.newPath);
        
        expect(extractedMergeRequestDiff).toBeDefined();
        expect(extractedMergeRequestDiff?.id).toBeDefined();
      }

    })
  });
});



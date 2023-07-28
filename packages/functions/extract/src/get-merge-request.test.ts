
import { describe, expect, test } from '@jest/globals';
import { unlink } from 'fs/promises';
import { getAllMergeRequests } from './get-merge-request';

import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import { mergeRequests } from '@acme/extract-schema';
import type { Context } from './config';
import type { GetAllMergeRequestsSourceControl, GetAllMergeRequestsEntities } from './get-merge-request';
import type { SourceControl } from '@acme/source-control';

let betterSqlite: ReturnType<typeof Database>;
let db: ReturnType<typeof drizzle>;
let context: Context<GetAllMergeRequestsSourceControl, GetAllMergeRequestsEntities>;
let fetchMergeRequests: SourceControl['fetchMergeRequests'];

const databaseName = 'fetch-merge-requests.db';

beforeAll(() => {
  betterSqlite = new Database(databaseName);
  db = drizzle(betterSqlite);

  migrate(db, { migrationsFolder: "../../../migrations/extract" });

  fetchMergeRequests = jest.fn((externalRepositoryId: number, page?: number, perPage?: number) => {
    switch (externalRepositoryId) {
      case 1000:
        return Promise.resolve({
          mergeRequests: [{ externalId: 1000, mergeRequestId: 1000, repositoryId: 1000 }],
          pagination: {
            page: page || 1,
            perPage: perPage || 40,
            totalPages: 1,
          },
        });
      case 2000:
        return Promise.resolve({
          mergeRequests: [{ externalId: 2000, mergeRequestId: 2000, repository: 2000 }, { externalId: 2001, mergeRequestId: 2001, repository: 2000 }],
          pagination: {
            page: page || 1,
            perPage: perPage || 40,
            totalPages: 1,
          },
        });
      default:
        return Promise.reject(new Error('Are you mocking me?'));
    }
  });

  context = {
    entities: { mergeRequests },
    integrations: {
      sourceControl: {
        fetchMergeRequests,
      }
    },
    db
  }

});

afterAll(async () => {
  betterSqlite.close();
  await unlink(databaseName);
});

describe('get-merge-request', () => {
  describe('getAllMergeRequest', () => {
    test('', async () => {
      const { mergeRequests, paginationInfo } = await getAllMergeRequests({ externalRepositoryId: 1000 }, context);

      expect(mergeRequests).toBeDefined();
      expect(paginationInfo).toBeDefined();
      expect(fetchMergeRequests).toHaveBeenCalledTimes(1);

      const mergeRequestData = db.select().from(context.entities.mergeRequests).all();

      expect(mergeRequestData.length).toEqual(mergeRequests.length);

      for (const mergeRequest of mergeRequestData) {
        expect(mergeRequests.find(mr => mr.externalId === mergeRequest.externalId)).toBeDefined();
      }
    });
  });
});

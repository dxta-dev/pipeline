
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from '@libsql/client';

import { describe, expect, test } from '@jest/globals';
import { getMergeRequests } from './get-merge-requests';

import { mergeRequests } from '@acme/extract-schema';
import type { Context } from './config';
import type { GetMergeRequestsSourceControl, GetMergeRequestsEntities } from './get-merge-requests';
import type { SourceControl, TimePeriod } from '@acme/source-control';
import fs from 'fs';

let betterSqlite: ReturnType<typeof createClient>;
let db: ReturnType<typeof drizzle>;
let context: Context<GetMergeRequestsSourceControl, GetMergeRequestsEntities>;
let fetchMergeRequests: SourceControl['fetchMergeRequests'];

const dbname = "get-merge-requests";

beforeAll(async () => {
  betterSqlite = createClient({
    url: `file:${dbname}`,
  });
  db = drizzle(betterSqlite);

  await migrate(db, { migrationsFolder: "../../../migrations/extract" });

  fetchMergeRequests = jest.fn((externalRepositoryId: number, namespaceName:string, repositoryName: string, repositoryId: number, creationPeriod?: TimePeriod, page?: number, perPage?: number) => {

    switch (externalRepositoryId) {
      case 1000:
        return Promise.resolve({
          mergeRequests: [{ 
            externalId: 1000,
            mergeRequestId: 1000,
            repositoryId: 1000,
            createdAt: new Date('2021-01-01'),
            state: 'open',
            title: 'Merge Request 1000',
            webUrl: 'https://gitlab.com/acme/merge-requests/1000',
          }],
          pagination: {
            page: page || 1,
            perPage: perPage || 40,
            totalPages: 1,
          },
        }) satisfies ReturnType<SourceControl['fetchMergeRequests']>;
      case 2000:
        return Promise.resolve({
          mergeRequests: [{ 
            externalId: 2000, 
            mergeRequestId: 2000, 
            repositoryId: 2000,
            createdAt: new Date('2021-01-01'),
            state: 'open',
            title: 'Merge Request 2000',
            webUrl: 'https://gitlab.com/acme/merge-requests/2000',
          }, { 
            externalId: 2001, 
            mergeRequestId: 2001, 
            repositoryId: 2000,
            createdAt: new Date('2021-01-02'),
            state: 'open',
            title: 'Merge Request 2001',
            webUrl: 'https://gitlab.com/acme/merge-requests/2001',
          }],
          pagination: {
            page: page || 1,
            perPage: perPage || 40,
            totalPages: 1,
          },
        }) satisfies ReturnType<SourceControl['fetchMergeRequests']>;
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

afterAll(() => {
  betterSqlite.close();
  fs.unlinkSync(dbname);
});

describe('get-merge-request:', () => {
  describe('getMergeRequests', () => {
    test('should create insert merge request data in the database', async () => {
      const { mergeRequests, paginationInfo } = await getMergeRequests({ externalRepositoryId: 2000, namespaceName: '', repositoryName: '', repositoryId: 2000}, context);

      expect(mergeRequests).toBeDefined();
      expect(paginationInfo).toBeDefined();
      expect(fetchMergeRequests).toHaveBeenCalledTimes(1);

      const mergeRequestData = await db.select().from(context.entities.mergeRequests).all();
      expect(mergeRequestData.length).toEqual(mergeRequests.length);
      
      for (const mergeRequest of mergeRequestData) {
        expect(mergeRequests.find(mr => mr.externalId === mergeRequest.externalId)).toBeDefined();
        expect(mergeRequests.find(mr => mr.id === mergeRequest.id)).toBeDefined();
      }
    });
  });
});

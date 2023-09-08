
import { describe, expect, test } from '@jest/globals';
import { getMergeRequests } from './get-merge-requests';

import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import { mergeRequests } from '@acme/extract-schema';
import type { Context } from './config';
import type { GetMergeRequestsSourceControl, GetMergeRequestsEntities } from './get-merge-requests';
import type { SourceControl, TimePeriod } from '@acme/source-control';

let betterSqlite: ReturnType<typeof Database>;
let db: ReturnType<typeof drizzle>;
let context: Context<GetMergeRequestsSourceControl, GetMergeRequestsEntities>;
let fetchMergeRequests: SourceControl['fetchMergeRequests'];

beforeAll(() => {
  betterSqlite = new Database(':memory:');
  db = drizzle(betterSqlite);

  migrate(db, { migrationsFolder: "../../../migrations/extract" });

  fetchMergeRequests = jest.fn((externalRepositoryId: number, namespaceName:string, repositoryName: string, repositoryId: number, timePeriod?: TimePeriod, page?: number, perPage?: number) => {

    const mergeRequestArray = [{ 
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
    }, { 
      externalId: 2002, 
      mergeRequestId: 2002, 
      repositoryId: 2000,
      createdAt: new Date('2021-02-01'),
      state: 'open',
      title: 'Merge Request 2001',
      webUrl: 'https://gitlab.com/acme/merge-requests/2001',
    }];

    let filteredArray = [];
    
    if (timePeriod) {
      filteredArray = mergeRequestArray.filter((mergeRequest) => {
        return mergeRequest.createdAt > (timePeriod.from as Date) && mergeRequest.createdAt < (timePeriod.to as Date)
      });
    } else {
      filteredArray = mergeRequestArray;
    }

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
          mergeRequests: filteredArray,
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
});

describe('get-merge-request:', () => {
  describe('getMergeRequests', () => {
    test('should create insert merge request data in the database', async () => {
      const { mergeRequests, paginationInfo } = await getMergeRequests({ externalRepositoryId: 2000, namespaceName: '', repositoryName: '', repositoryId: 2000}, context);

      expect(mergeRequests).toBeDefined();
      expect(paginationInfo).toBeDefined();
      expect(fetchMergeRequests).toHaveBeenCalledTimes(1);

      const mergeRequestData = db.select().from(context.entities.mergeRequests).all();
      expect(mergeRequestData.length).toEqual(mergeRequests.length);
      
      for (const mergeRequest of mergeRequestData) {
        expect(mergeRequests.find(mr => mr.externalId === mergeRequest.externalId)).toBeDefined();
        expect(mergeRequests.find(mr => mr.id === mergeRequest.id)).toBeDefined();
      }
    });
    test('should only insert merge requests that are within the time period', async () => {
      // Cleared the database just to have the data for this test
      db.delete(context.entities.mergeRequests).run();
      
      const { mergeRequests, paginationInfo } = await getMergeRequests({ externalRepositoryId: 2000, namespaceName: '', repositoryName: '', repositoryId: 2000, timePeriod: { from: new Date('2021-01-01'), to: new Date('2021-01-31')} }, context);

      expect(mergeRequests).toBeDefined();
      expect(paginationInfo).toBeDefined();
      expect(fetchMergeRequests).toHaveBeenCalled();

      const mergeRequestData = db.select().from(context.entities.mergeRequests).all();

      expect(mergeRequestData.length).toEqual(mergeRequests.length);
      
      for (const mergeRequest of mergeRequestData) {
        expect(mergeRequests.find(mr => mr.externalId === mergeRequest.externalId)).toBeDefined();
        expect(mergeRequests.find(mr => mr.id === mergeRequest.id)).toBeDefined();
      }
    });
  });
});

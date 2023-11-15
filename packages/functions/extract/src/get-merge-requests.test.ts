
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from '@libsql/client';

import { describe, expect, test } from '@jest/globals';
import { getMergeRequests } from './get-merge-requests';

import { type NewMergeRequest, mergeRequests, type NewRepository, repositories } from '@acme/extract-schema';
import type { Context } from './config';
import type { GetMergeRequestsSourceControl, GetMergeRequestsEntities } from './get-merge-requests';
import type { SourceControl, TimePeriod } from '@acme/source-control';
import fs from 'fs';

let sqlite: ReturnType<typeof createClient>;
let db: ReturnType<typeof drizzle>;
let context: Context<GetMergeRequestsSourceControl, GetMergeRequestsEntities>;
let fetchMergeRequests: SourceControl['fetchMergeRequests'];

const TEST_REPO = { id: 1, externalId: 1000, name: 'TEST_REPO_NAME', forgeType: 'github' } satisfies NewRepository;

const dbname = "get-merge-requests";

beforeAll(async () => {
  sqlite = createClient({
    url: `file:${dbname}`,
  });
  db = drizzle(sqlite);

  await migrate(db, { migrationsFolder: "../../../migrations/extract" });
  await db.insert(repositories).values(TEST_REPO).run();

  fetchMergeRequests = jest.fn((externalRepositoryId: number, namespaceName:string, repositoryName: string, repositoryId: number, perPage: number, timePeriod?: TimePeriod, page?: number) => {

    const mergeRequestArray = [{ 
      externalId: 2000, 
      canonId: 2000, 
      repositoryId: 1,
      createdAt: new Date('2021-01-01'),
      state: 'open',
      title: 'Merge Request 2000',
      webUrl: 'https://gitlab.com/acme/merge-requests/2000',
    }, { 
      externalId: 2001, 
      canonId: 2001, 
      repositoryId: 1,
      createdAt: new Date('2021-01-02'),
      state: 'open',
      title: 'Merge Request 2001',
      webUrl: 'https://gitlab.com/acme/merge-requests/2001',
    }, { 
      externalId: 2002, 
      canonId: 2002, 
      repositoryId: 1,
      createdAt: new Date('2021-02-01'),
      state: 'open',
      title: 'Merge Request 2001',
      webUrl: 'https://gitlab.com/acme/merge-requests/2001',
    }] satisfies NewMergeRequest[];

    let filteredArray = [];
    
    if (timePeriod) {
      filteredArray = mergeRequestArray.filter((mergeRequest) => {
        return mergeRequest.createdAt > timePeriod.from && mergeRequest.createdAt < timePeriod.to;
      });
    } else {
      filteredArray = mergeRequestArray;
    }

    switch (externalRepositoryId) {
      case 1000:
        return Promise.resolve({
          mergeRequests: [{ 
            externalId: 1000,
            canonId: 1000,
            repositoryId: 1000,
            createdAt: new Date('2021-01-01'),
            state: 'open',
            title: 'Merge Request 1000',
            webUrl: 'https://gitlab.com/acme/merge-requests/1000',
          }],
          pagination: {
            page: page || 1,
            perPage,
            totalPages: 1,
          },
        }) satisfies ReturnType<SourceControl['fetchMergeRequests']>;
      case 2000:
        return Promise.resolve({
          mergeRequests: filteredArray,
          pagination: {
            page: page || 1,
            perPage,
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
  sqlite.close();
  fs.unlinkSync(dbname);
});

describe('get-merge-request:', () => {
  describe('getMergeRequests', () => {
    test('should create insert merge request data in the database', async () => {
      const { mergeRequests, paginationInfo } = await getMergeRequests({ externalRepositoryId: 2000, namespaceName: '', repositoryName: '', repositoryId: 2000, perPage: 1000}, context);

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
    test('should only insert merge requests that are within the time period', async () => {
      // Cleared the database just to have the data for this test
      await db.delete(context.entities.mergeRequests).run();
      
      const { mergeRequests, paginationInfo } = await getMergeRequests({ externalRepositoryId: 2000, namespaceName: '', repositoryName: '', repositoryId: 2000, timePeriod: { from: new Date('2021-01-01'), to: new Date('2021-01-31')}, perPage: 1000 }, context);

      expect(mergeRequests).toBeDefined();
      expect(paginationInfo).toBeDefined();
      expect(fetchMergeRequests).toHaveBeenCalled();

      const mergeRequestData = await db.select().from(context.entities.mergeRequests).all();

      expect(mergeRequestData.length).toEqual(mergeRequests.length);
      
      for (const mergeRequest of mergeRequestData) {
        expect(mergeRequests.find(mr => mr.externalId === mergeRequest.externalId)).toBeDefined();
        expect(mergeRequests.find(mr => mr.id === mergeRequest.id)).toBeDefined();
      }
    });
  });
});

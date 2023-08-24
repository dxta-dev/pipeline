import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { Context } from "./config";
import { type GetMergeRequestCommitsEntities, type GetMergeRequestCommitsSourceControl, getMergeRequestCommits } from "./get-merge-request-commits";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mergeRequestCommits } from "@acme/extract-schema";
import { unlink } from "fs/promises";

let betterSqlite: ReturnType<typeof Database>;
const databaseName = 'get-merge-request-commits.db';
let db: ReturnType<typeof drizzle>;
let context: Context<GetMergeRequestCommitsSourceControl, GetMergeRequestCommitsEntities>;
let fetchMergeRequestCommits: jest.MockedFunction<GetMergeRequestCommitsSourceControl['fetchMergeRequestCommits']>;

beforeAll(() => {
  betterSqlite = new Database(databaseName);
  db = drizzle(betterSqlite);

  migrate(db, { migrationsFolder: "../../../migrations/extract" });

  fetchMergeRequestCommits = jest.fn((externalRepositoryId: number, namespaceName: string, repositoryName: string, mergerequestIId: number): ReturnType<GetMergeRequestCommitsSourceControl['fetchMergeRequestCommits']> => {
    switch (mergerequestIId) {
      case 1000:
        return Promise.resolve({
          mergeRequestCommits: [
            {
              mergeRequestId: mergerequestIId,
              externalId: '4b14eb1cb5cdb1937f17e0aafaa697f1f943f546',
              createdAt: new Date('2023-01-02'),
              authoredDate: new Date('2023-01-02'),
              committedDate: new Date('2023-01-02'),
              title: 'MOCK FIRST TITLE',
              message: 'MOCK FIRST MESSAGE',
              authorName: 'MOCK AUTHOR',
              authorEmail: 'mock@author.com'
            },
            {
              mergeRequestId: mergerequestIId,
              externalId: '6c307422a2957215f63b826491dc33a51dc08f03',
              createdAt: new Date('2023-01-05'),
              authoredDate: new Date('2023-01-05'),
              committedDate: new Date('2023-01-05'),
              title: 'MOCK SECOND TITLE',
              message: 'MOCK SECOND MESSAGE',
              authorName: 'MOCK AUTHOR',
              authorEmail: 'mock@author.com'
            },
          ]
        });
      default:
        return Promise.reject(new Error('Are you mocking me?'));
    }
  });

  context = {
    db,
    entities: {
      mergeRequestCommits,
    },
    integrations: {
      sourceControl: { fetchMergeRequestCommits }
    }
  }
});

afterAll(async () => {
  betterSqlite.close();
  await unlink(databaseName);
});

describe('get-merge-request-commits:', () => {
  describe('getMergeRequestCommits', () => {
    test('should insert merge request commits data into db', async () => {
      const { mergeRequestCommits } = await getMergeRequestCommits({
        externalRepositoryId: 1,
        namespaceName: 'MOCK NAME',
        repositoryName: 'MOCK REPO NAME',
        mergerequestIId: 1000,
      }, context);

      expect(mergeRequestCommits).toBeDefined();
      expect(fetchMergeRequestCommits).toHaveBeenCalledTimes(1);

      const mergeRequestCommitsRows = db.select().from(context.entities.mergeRequestCommits).all();
      expect(mergeRequestCommitsRows).toHaveLength(2);

      for (const mergeRequestCommit of mergeRequestCommitsRows) {
        expect(mergeRequestCommits.find(mrc => mrc.id === mergeRequestCommit.id)).toBeDefined();
        expect(mergeRequestCommits.find(mrc => mrc.externalId === mergeRequestCommit.externalId)).toBeDefined();
      }
    });
  })
})
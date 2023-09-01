import { describe, expect, test } from '@jest/globals';
import { unlink } from 'fs/promises';

import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import { members } from '@acme/extract-schema';
import type { Context } from './config';
import type { GetMemberInfoSourceControl, GetMemberInfoEntities} from './get-member-info';
import { getMemberInfo } from './get-member-info';
import type { SourceControl } from '@acme/source-control';
import { eq } from 'drizzle-orm';

let betterSqlite: ReturnType<typeof Database>;
let db: ReturnType<typeof drizzle>;
let context: Context<GetMemberInfoSourceControl, GetMemberInfoEntities>;
let fetchUserInfo: SourceControl['fetchUserInfo'];

const databaseName = 'user-info.db';

beforeAll(() => {
  betterSqlite = new Database(databaseName);
  db = drizzle(betterSqlite);

  migrate(db, { migrationsFolder: "../../../migrations/extract" });

  fetchUserInfo = jest.fn((username: string) => {
    switch (username) {
      case 'deki':
        return Promise.resolve({
          member:
            { externalId: 1000, name: 'Dejan', username: 'dejan-crocoder', email: 'deki.the.wizard@gmail.com' },
        }) satisfies ReturnType<SourceControl['fetchUserInfo']>;
      default:
        return Promise.reject(new Error("Are you mocking me?"))
    }
  });

  context = {
    entities: { members },
    db,
    integrations: {
      sourceControl: {
        fetchUserInfo,
      }
    }
  };

});

beforeEach(() => {
  db.insert(members).values({
    id: 1,
    username: 'deki',
    externalId: 1000,
    name: null,
    email: null,
  }).run();
});

afterEach(() => {
  db.delete(members).where(eq(members.id, 1)).run();
});

afterAll(async () => {
  betterSqlite.close();
  await unlink(databaseName);
});

describe('get-member-info:', () => {
  describe('getUserInfo', () => {
    test('should update member data in the db', async () => {
      const { member } = await getMemberInfo({
        memberId: 1,
      }, context);

      expect(member).toBeDefined();
      expect(member).toMatchObject({
        id: 1,
        username: 'dejan-crocoder',
        externalId: 1000,
        name: 'Dejan',
        email: 'deki.the.wizard@gmail.com',
      });
      expect(fetchUserInfo).toHaveBeenCalledTimes(1);
    });
  });
});


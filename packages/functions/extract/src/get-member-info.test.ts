import { describe, expect, test } from '@jest/globals';

import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from '@libsql/client';
import { members } from '@dxta/extract-schema';
import type { Context } from './config';
import type { GetMemberInfoSourceControl, GetMemberInfoEntities } from './get-member-info';
import { getMemberInfo } from './get-member-info';
import type { SourceControl } from '@dxta/source-control';
import { eq } from 'drizzle-orm';
import fs from 'fs';

let sqlite: ReturnType<typeof createClient>;
let db: ReturnType<typeof drizzle>;
let context: Context<GetMemberInfoSourceControl, GetMemberInfoEntities>;
let fetchUserInfo: SourceControl['fetchUserInfo'];

const dbname = "get-member-info";

beforeAll(async () => {
  sqlite = createClient({
    url: `file:${dbname}`,
  });
  db = drizzle(sqlite);

  await migrate(db, { migrationsFolder: "../../../migrations/combined" });

  fetchUserInfo = jest.fn((externalId: number, username: string) => {
    switch (username) {
      case 'deki':
        return Promise.resolve({
          member:
            { externalId, forgeType: 'github', name: 'Dejan', username: 'dejan-crocoder', email: 'deki.the.wizard@gmail.com' },
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

beforeEach(async () => {
  await db.insert(members).values({
    id: 1,
    username: 'deki',
    externalId: 1000,
    forgeType: 'github',
    name: null,
    email: null,
  }).run();
});

afterEach(async () => {
  await db.delete(members).where(eq(members.id, 1)).run();
});

afterAll(() => {
  sqlite.close();
  fs.unlinkSync(dbname);
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

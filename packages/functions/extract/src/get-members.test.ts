
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from '@libsql/client';


import { describe, expect, test } from '@jest/globals';
import { getMembers } from './get-members';

import { members, repositoriesToMembers } from '@acme/extract-schema';
import type { Context } from './config';
import type { GetMembersSourceControl, GetMembersEntities } from './get-members';
import type { SourceControl } from '@acme/source-control';
import fs from 'fs';

let sqlite: ReturnType<typeof createClient>;
let db: ReturnType<typeof drizzle>;
let context: Context<GetMembersSourceControl, GetMembersEntities>;
let fetchMembers: SourceControl['fetchMembers'];


const dbname = "get-members";

beforeAll(async () => {
  sqlite = createClient({
    url: `file:${dbname}`,
  });
  db = drizzle(sqlite);

  await migrate(db, { migrationsFolder: "../../../migrations/extract" });

  fetchMembers = jest.fn((externalRepositoryId, namespaceName, repositoryName, page?: number, perPage?: number) => {
    switch (externalRepositoryId) {
      case 1000:
        return Promise.resolve({
          members: [
            { externalId: 1000, name: 'Dejan', username: 'dejan-crocoder', forgeType: 'github' }
          ],
          pagination: {
            page: 1 || page,
            perPage: 30 || perPage,
            totalPages: 1,
          }
        }) satisfies ReturnType<SourceControl['fetchMembers']>;
      default:
        return Promise.reject(new Error("Are you mocking me?"))
    }
  });

  context = {
    entities: { members, repositoriesToMembers },
    db,
    integrations: {
      sourceControl: {
        fetchMembers
      }
    }
  };

});

afterAll(() => {
  sqlite.close();
  fs.unlinkSync(dbname);
});

describe('get-members:', () => {
  describe('getMembers', () => {
    test('should insert member data in the database', async () => {
      const { members, paginationInfo } = await getMembers({
        externalRepositoryId: 1000,
        namespaceName: '',
        repositoryName: '',
        repositoryId: 2000,
      }, context);

      expect(members).toBeDefined();
      expect(paginationInfo).toBeDefined();
      expect(fetchMembers).toHaveBeenCalledTimes(1);

      const memberRows = await db.select().from(context.entities.members).all();
      expect(memberRows.length).toEqual(members.length);

      for (const memberRow of memberRows) {
        const rowMatchedMember = members.find((m) => m.externalId === memberRow.externalId);
        expect(rowMatchedMember).toBeDefined();
        if (!rowMatchedMember) return;
        expect(rowMatchedMember.id).toEqual(memberRow.id);
      }
    });
  });
});

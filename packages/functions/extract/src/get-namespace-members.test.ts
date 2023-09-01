import { describe, expect, test } from '@jest/globals';
import { unlink } from 'fs/promises';
import { getNamespaceMembers } from './get-namespace-members';

import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import { members, repositories, repositoriesToMembers } from '@acme/extract-schema';
import type { Context } from './config';
import type { GetNamespaceMembersSourceControl, GetNamespaceMembersEntities } from './get-namespace-members';
import type { SourceControl } from '@acme/source-control';

let betterSqlite: ReturnType<typeof Database>;
let db: ReturnType<typeof drizzle>;
let context: Context<GetNamespaceMembersSourceControl, GetNamespaceMembersEntities>;
let fetchNamespaceMembers: SourceControl['fetchNamespaceMembers'];

const databaseName = 'fetch-namespace-members.db';

beforeAll(() => {
  betterSqlite = new Database(databaseName);
  db = drizzle(betterSqlite);

  migrate(db, { migrationsFolder: "../../../migrations/extract" });
 
  db.insert(repositories).values({
    id: 1,
    name: 'crocoder-dev',
    externalId: 1000,
  }).run();

  fetchNamespaceMembers = jest.fn((namespaceName, page?: number, perPage?: number) => {
    switch (namespaceName) {
      case 'crocoder-dev':
        return Promise.resolve({
          members: [
            { externalId: 1000, name: 'Dejan', username: 'dejan-crocoder' }
          ],
          pagination: {
            page: 1 || page,
            perPage: 30 || perPage,
            totalPages: 1,
          }
        }) satisfies ReturnType<SourceControl['fetchNamespaceMembers']>;
      default:
        return Promise.reject(new Error("Are you mocking me?"))
    }
  });

  context = {
    entities: { members, repositoriesToMembers },
    db,
    integrations: {
      sourceControl: {
        fetchNamespaceMembers,
      }
    }
  };

});



afterAll(async () => {
  betterSqlite.close();
  await unlink(databaseName);
});

describe('get-namespace-members:', () => {
  describe('getNamespaceMembers', () => {
    test('should insert member data in the database', async () => {
      const { members, paginationInfo } = await getNamespaceMembers({
        namespaceName: 'crocoder-dev',
        repositoryId: 1,
      }, context);

      expect(members).toBeDefined();
      expect(paginationInfo).toBeDefined();
      expect(fetchNamespaceMembers).toHaveBeenCalledTimes(1);

      const memberRows = db.select().from(context.entities.members).all();
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


import { describe, expect, test } from "@jest/globals";

import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from "@libsql/client";
import { and, eq, inArray } from "drizzle-orm";
import fs from "fs";

import * as extract from "@acme/extract-schema";
import * as transform from "@acme/transform-schema";
import type { Context } from "./config";
import type { SetForgeUsersExtractEntities, SetForgeUsersTransformEntities } from "./set-forge-users";
import { setForgeUsers } from "./set-forge-users";

let sqlite: ReturnType<typeof createClient>;
let db: ReturnType<typeof drizzle>;
let context: Context<SetForgeUsersExtractEntities, SetForgeUsersTransformEntities>;

const dbName = 'set-forge-users';

beforeAll(async () => {
  sqlite = createClient({
    url: `file:${dbName}`,
  });
  db = drizzle(sqlite);

  await migrate(db, { migrationsFolder: "../../../migrations/tenant-db" });

  context = {
    extract: {
      db,
      entities: {
        members: extract.members,
      }
    },
    transform: {
      db,
      entities: {
        forgeUsers: transform.forgeUsers
      }
    }
  };
});

afterAll(() => {
  sqlite.close();
  fs.unlinkSync(dbName);
});

beforeEach(async () => {
  await db.insert(context.extract.entities.members).values([
    {
      id: 1, username: 'deki', externalId: 1000, forgeType: 'github', name: 'Deki', email: null,
    },
    {
      id: 2, username: 'deki', externalId: 1001, forgeType: 'github', name: null, email: null,
    },
    {
      id: 3, username: 'deki', externalId: 1002, forgeType: 'github', name: 'Deki', email: null,
    },
  ]).run();
});

afterEach(async () => {
  await db.delete(context.extract.entities.members).run();
  await db.delete(context.transform.entities.forgeUsers).run();
});

describe('set-forge-users', () => {
  describe('setMergeRequests', () => {
    test('should insert values into db', async () => {
      const extractMemberIds = [1, 2, 3];
      await setForgeUsers({ extractMemberIds }, context);

      const transformMergeRequestRows = await db
        .select({
          externalId: context.transform.entities.forgeUsers.externalId,
          name: context.transform.entities.forgeUsers.name,
        })
        .from(context.transform.entities.forgeUsers)
        .where(
          and(
            inArray(context.transform.entities.forgeUsers.externalId, [1000, 1001, 1002]),
            eq(context.transform.entities.forgeUsers.forgeType, "github")
          )
        ).all();


      expect(transformMergeRequestRows.find((row) => row.externalId === 1000)).toEqual({
        externalId: 1000, name: 'Deki',
      });

      expect(transformMergeRequestRows.find((row) => row.externalId === 1001)).toEqual({
        externalId: 1001, name: 'deki',
      });

      expect(transformMergeRequestRows.find((row) => row.externalId === 1002)).toEqual({
        externalId: 1002, name: 'Deki',
      });
    });
  });
});

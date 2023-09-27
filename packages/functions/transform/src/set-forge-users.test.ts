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

let extractSqlite: ReturnType<typeof createClient>;
let extractDb: ReturnType<typeof drizzle>;
let transformSqlite: ReturnType<typeof createClient>;
let transformDb: ReturnType<typeof drizzle>;
let context: Context<SetForgeUsersExtractEntities, SetForgeUsersTransformEntities>;

const extractDbName = 'extract-set-forge-users';
const transformDbName = 'transform-set-forge-users';

beforeAll(async () => {
  extractSqlite = createClient({
    url: `file:${extractDbName}`,
  });
  extractDb = drizzle(extractSqlite);

  transformSqlite = createClient({
    url: `file:${transformDbName}`,
  });
  transformDb = drizzle(transformSqlite);

  await migrate(extractDb, { migrationsFolder: "../../../migrations/extract" });
  await migrate(transformDb, { migrationsFolder: "../../../migrations/transform" });

  context = {
    extract: {
      db: extractDb,
      entities: {
        members: extract.members,
      }
    },
    transform: {
      db: transformDb,
      entities: {
        forgeUsers: transform.forgeUsers
      }
    }
  };
});

afterAll(() => {
  extractSqlite.close();
  transformSqlite.close();
  fs.unlinkSync(extractDbName);
  fs.unlinkSync(transformDbName);
});

beforeEach(async () => {
  await extractDb.insert(context.extract.entities.members).values([
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
  await extractDb.delete(context.extract.entities.members).run();
  await transformDb.delete(context.transform.entities.forgeUsers).run();
});

describe('set-forge-users', () => {
  describe('setMergeRequests', () => {
    test('should insert values into db', async () => {
      const extractMemberIds = [1, 2, 3];
      await setForgeUsers({ extractMemberIds }, context);

      const transformMergeRequestRows = await transformDb
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

import { describe, expect, test } from "@jest/globals";

import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import fs from "fs";

import * as extract from "@acme/extract-schema";
import * as transform from "@acme/transform-schema";
import type { Context } from "./config";
import type { SetRepositoryExtractEntities, SetRepositoryTransformEntities } from "./set-repository";
import { setRepository } from "./set-repository";

let extractSqlite: ReturnType<typeof createClient>;
let extractDb: ReturnType<typeof drizzle>;
let transformSqlite: ReturnType<typeof createClient>;
let transformDb: ReturnType<typeof drizzle>;
let context: Context<SetRepositoryExtractEntities, SetRepositoryTransformEntities>;

const extractDbName = 'extract-set-repository';
const transformDbName = 'transform-set-repository';

const TEST_REPO_1 = { id: 1, externalId: 1000, name: 'TEST_REPO_NAME', forgeType: 'github' } satisfies extract.NewRepository;

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

  await extractDb.insert(extract.repositories).values(TEST_REPO_1).run();

  context = {
    extract: {
      db: extractDb,
      entities: {
        repositories: extract.repositories
      }
    },
    transform: {
      db: transformDb,
      entities: {
        repositories: transform.repositories
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

describe('set-repository', () => {
  describe('setRepository', () => {
    test('should insert values into db', async () => {
      await setRepository({
        extractRepositoryId: TEST_REPO_1.id,
        forgeType: 'github'
      }, context);

      const transformedRepositoryRow = await transformDb.select().from(transform.repositories)
        .where(eq(transform.repositories.externalId, TEST_REPO_1.externalId))
        .get();
      
        expect(transformedRepositoryRow).toBeDefined();
        expect(transformedRepositoryRow?.name).toEqual(TEST_REPO_1.name);
    });
  });
});
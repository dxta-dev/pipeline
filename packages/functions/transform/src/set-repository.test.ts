import { describe, expect, test } from "@jest/globals";

import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import fs from "fs";

import * as extract from "@dxta/extract-schema";
import * as transform from "@dxta/transform-schema";
import type { Context } from "./config";
import type { SetRepositoryExtractEntities, SetRepositoryTransformEntities } from "./set-repository";
import { setRepository } from "./set-repository";

let sqlite: ReturnType<typeof createClient>;
let db: ReturnType<typeof drizzle>;
let context: Context<SetRepositoryExtractEntities, SetRepositoryTransformEntities>;

const dbName = 'set-repository';

const TEST_NAMESPACE_1 = { id: 1, externalId: 2000, name: 'TEST_NAMESPACE_NAME', forgeType: 'github' } satisfies extract.NewNamespace;
const TEST_REPO_1 = { id: 1, externalId: 1000, name: 'TEST_REPO_NAME', forgeType: 'github', namespaceId: 1 } satisfies extract.NewRepository;

beforeAll(async () => {
  sqlite = createClient({
    url: `file:${dbName}`,
  });
  db = drizzle(sqlite);

  await migrate(db, { migrationsFolder: "../../../migrations/tenant-db" });

  await db.insert(extract.namespaces).values(TEST_NAMESPACE_1).run();
  await db.insert(extract.repositories).values(TEST_REPO_1).run();

  context = {
    extract: {
      db,
      entities: {
        repositories: extract.repositories
      }
    },
    transform: {
      db,
      entities: {
        repositories: transform.repositories
      }
    }
  };
});

afterAll(() => {
  sqlite.close();
  fs.unlinkSync(dbName);
});

describe('set-repository', () => {
  describe('setRepository', () => {
    test('should insert values into db', async () => {
      await setRepository({
        extractRepositoryId: TEST_REPO_1.id
      }, context);

      const transformedRepositoryRow = await db.select().from(transform.repositories)
        .where(eq(transform.repositories.externalId, TEST_REPO_1.externalId))
        .get();

      expect(transformedRepositoryRow).toBeDefined();
      expect(transformedRepositoryRow?.name).toEqual(TEST_REPO_1.name);
    });
  });
});
import { describe, expect, test } from "@jest/globals";

import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from "@libsql/client";
import { and, eq, inArray } from "drizzle-orm";
import fs from "fs";

import * as extract from "@acme/extract-schema";
import * as transform from "@acme/transform-schema";
import type { Context } from "./config";
import type { SetMergeRequestsExtractEntities, SetMergeRequestsTransformEntities } from "./set-merge-requests";
import { setMergeRequests } from "./set-merge-requests";

let extractSqlite: ReturnType<typeof createClient>;
let extractDb: ReturnType<typeof drizzle>;
let transformSqlite: ReturnType<typeof createClient>;
let transformDb: ReturnType<typeof drizzle>;
let context: Context<SetMergeRequestsExtractEntities, SetMergeRequestsTransformEntities>;

const extractDbName = 'extract-set-merge-requests';
const transformDbName = 'transform-set-merge-requests';

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
  await extractDb.insert(extract.namespaces).values([
    { id: 1, externalId: 2000, forgeType: 'github', name: 'crocoder-dev' }
  ]);


  context = {
    extract: {
      db: extractDb,
      entities: {
        repositories: extract.repositories,
        mergeRequests: extract.mergeRequests
      }
    },
    transform: {
      db: transformDb,
      entities: {
        mergeRequests: transform.mergeRequests
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
  await extractDb.insert(context.extract.entities.repositories).values([
    { id: 1, externalId: 1000, forgeType: 'github', name: 'Repo-repo', namespaceId: 1 }
  ]);
  await extractDb.insert(context.extract.entities.mergeRequests).values([
    { id: 1, canonId: 1, createdAt: new Date(), externalId: 2000, repositoryId: 1, title: "Test", webUrl: "http://localhost/Test" },
    { id: 2, canonId: 2, createdAt: new Date(), externalId: 2001, repositoryId: 1, title: "Test", webUrl: "http://localhost/Test" },
    { id: 3, canonId: 3, createdAt: new Date(), externalId: 2002, repositoryId: 1, title: "Test", webUrl: "http://localhost/Test" },
  ]);
});

afterEach(async () => {
  await extractDb.delete(context.extract.entities.mergeRequests).run();
  await extractDb.delete(context.extract.entities.repositories).run();
  await transformDb.delete(context.transform.entities.mergeRequests).run();
});

describe('set-merge-requests', () => {
  describe('setMergeRequests', () => {
    test('should insert values into db', async () => {
      const extractMergeRequestIds = [1, 2, 3];
      await setMergeRequests({ extractMergeRequestIds }, context);

      const transformMergeRequestRows = await transformDb.select({
        title: context.transform.entities.mergeRequests.title,
        webUrl: context.transform.entities.mergeRequests.webUrl
      }).from(context.transform.entities.mergeRequests)
        .where(
          and(
            inArray(context.transform.entities.mergeRequests.externalId, [2000, 2001, 2002]),
            eq(context.transform.entities.mergeRequests.forgeType, "github")
          )
        ).all();

      expect(transformMergeRequestRows).toEqual([
        { title: "Test", webUrl: "http://localhost/Test" },
        { title: "Test", webUrl: "http://localhost/Test" },
        { title: "Test", webUrl: "http://localhost/Test" },
      ]);
    });
  });
});
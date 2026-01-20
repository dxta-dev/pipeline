import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from "@libsql/client";

import { describe, expect, test } from "@jest/globals";
import { getMergeRequestsDiffs } from "./get-merge-request-diffs";

import {
  mergeRequestDiffs,
  mergeRequests,
  namespaces,
  repositories,
} from "@dxta/extract-schema";
import type {
  MergeRequest,
  Namespace,
  NewMergeRequest,
  NewNamespace,
  NewRepository,
  Repository,
} from "@dxta/extract-schema";
import type { Context } from "./config";
import type {
  GetMergeRequestDiffsSourceControl,
  GetMergeRequestDiffsEntities,
} from "./get-merge-request-diffs";
import fs from "fs";

let sqlite: ReturnType<typeof createClient>;
let db: ReturnType<typeof drizzle>;
let context: Context<
  GetMergeRequestDiffsSourceControl,
  GetMergeRequestDiffsEntities
>;
let fetchMergeRequestDiffs: jest.MockedFunction<
  GetMergeRequestDiffsSourceControl["fetchMergeRequestDiffs"]
>;

const TEST_NAMESPACE_1 = {
  id: 1,
  externalId: 2000,
  name: "TEST_NAMESPACE_NAME",
  forgeType: "github",
} satisfies NewNamespace;
const TEST_REPO_1 = {
  id: 1,
  externalId: 1000,
  name: "TEST_REPO_NAME",
  forgeType: "github",
  namespaceId: 1,
} satisfies NewRepository;
const TEST_MERGE_REQUEST_1 = {
  id: 1,
  externalId: 3000,
  createdAt: new Date(),
  canonId: 1,
  repositoryId: 1,
  title: "TEST_MR",
  webUrl: "localhost",
} satisfies NewMergeRequest;

const dbname = "get-merge-request-diffs";

beforeAll(async () => {
  sqlite = createClient({
    url: `file:${dbname}`,
  });
  db = drizzle(sqlite);

  await migrate(db, { migrationsFolder: "../../../migrations/combined" });
  await db.insert(namespaces).values([TEST_NAMESPACE_1]).run();
  await db.insert(repositories).values([TEST_REPO_1]).run();
  await db.insert(mergeRequests).values([TEST_MERGE_REQUEST_1]).run();

  fetchMergeRequestDiffs = jest.fn(
    (
      repository: Repository,
      namespace: Namespace,
      mergeRequest: MergeRequest,
      perPage: number,
      page?: number,
    ): ReturnType<
      GetMergeRequestDiffsSourceControl["fetchMergeRequestDiffs"]
    > => {
      switch (mergeRequest.externalId) {
        case 3000:
          return Promise.resolve({
            mergeRequestDiffs: [
              {
                mergeRequestId: mergeRequest.id,
                diff: "",
                newPath: "file1",
                oldPath: "file1",
                aMode: "",
                bMode: "",
                newFile: true,
                renamedFile: false,
                deletedFile: false,
              },
              {
                mergeRequestId: mergeRequest.id,
                diff: "",
                newPath: "file2",
                oldPath: "file2",
                aMode: "",
                bMode: "",
                newFile: true,
                renamedFile: false,
                deletedFile: false,
              },
            ],
            pagination: {
              page: page || 1,
              perPage,
              totalPages: 1,
            },
          });
        default:
          return Promise.reject(new Error("Are you mocking me?"));
      }
    },
  );

  context = {
    db,
    entities: {
      mergeRequestDiffs,
      mergeRequests,
      namespaces,
      repositories,
    },
    integrations: {
      sourceControl: { fetchMergeRequestDiffs },
    },
  };
});

afterAll(() => {
  sqlite.close();
  fs.unlinkSync(dbname);
});

describe("get-merge-request-diffs:", () => {
  describe("getMergeRequestDiffs", () => {
    test("should insert merge request diff data in the db", async () => {
      const { mergeRequestDiffs, paginationInfo } = await getMergeRequestsDiffs(
        {
          mergeRequestId: TEST_MERGE_REQUEST_1.id,
          namespaceId: TEST_NAMESPACE_1.id,
          repositoryId: TEST_REPO_1.id,
          perPage: 1000,
        },
        context,
      );

      expect(mergeRequestDiffs).toBeDefined();
      expect(paginationInfo).toBeDefined();
      expect(fetchMergeRequestDiffs).toHaveBeenCalledTimes(1);

      const mergeRequestDiffRows = await db
        .select()
        .from(context.entities.mergeRequestDiffs)
        .all();
      expect(mergeRequestDiffRows).toHaveLength(2);

      for (const mergeRequestDiffRow of mergeRequestDiffRows) {
        const extractedMergeRequestDiff = mergeRequestDiffs.find(
          (mergeRequestDiff) =>
            mergeRequestDiff.mergeRequestId ===
              mergeRequestDiffRow.mergeRequestId &&
            mergeRequestDiff.newPath === mergeRequestDiffRow.newPath,
        );

        expect(extractedMergeRequestDiff).toBeDefined();
        expect(extractedMergeRequestDiff?.id).toBeDefined();
      }
    });
  });
});

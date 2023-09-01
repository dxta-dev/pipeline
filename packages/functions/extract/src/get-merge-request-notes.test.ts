import { describe, expect, test } from '@jest/globals';
import { unlink } from 'fs/promises';
import { getMergeRequestNotes } from './get-merge-request-notes';

import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import { mergeRequestNotes, mergeRequests, namespaces, repositories } from "@acme/extract-schema";
import type { MergeRequest, Namespace, NewMergeRequest, NewNamespace, NewRepository, Repository } from "@acme/extract-schema";
import type { Context } from './config';
import type { GetMergeRequestNotesSourceControl, GetMergeRequestNotesEntities } from './get-merge-request-notes';

let betterSqlite: ReturnType<typeof Database>;
const databaseName = 'get-merge-request-notes.db';
let db: ReturnType<typeof drizzle>;
let context: Context<GetMergeRequestNotesSourceControl, GetMergeRequestNotesEntities>;
let fetchMergeRequestNotes: jest.MockedFunction<GetMergeRequestNotesSourceControl['fetchMergeRequestNotes']>;

const TEST_REPO_1 = { id: 1, externalId: 1000, name: 'TEST_REPO_NAME' } satisfies NewRepository;
const TEST_NAMESPACE_1 = { id: 1, externalId: 2000, name: 'TEST_NAMESPACE_NAME' } satisfies NewNamespace;
const TEST_MERGE_REQUEST_1 = { id: 1, externalId: 3000, createdAt: new Date(), mergeRequestId: 1, repositoryId: 1, title: "TEST_MR", webUrl: "localhost" } satisfies NewMergeRequest;

beforeAll(() => {
  betterSqlite = new Database(databaseName);
  db = drizzle(betterSqlite);

  migrate(db, { migrationsFolder: "../../../migrations/extract" });
  db.insert(repositories).values([TEST_REPO_1]).run();
  db.insert(namespaces).values([TEST_NAMESPACE_1]).run();
  db.insert(mergeRequests).values([TEST_MERGE_REQUEST_1]).run();

  fetchMergeRequestNotes = jest.fn((repository: Repository, namespace: Namespace, mergeRequest: MergeRequest): ReturnType<GetMergeRequestNotesSourceControl["fetchMergeRequestNotes"]> => {
    switch (mergeRequest.externalId) {
      case 3000:
        return Promise.resolve({
          mergeRequestNotes: [
            {
              externalId: 4000,
              mergeRequestId: mergeRequest.id,
              createdAt: new Date(),
              updatedAt: new Date(),
              authorUsername: 'dejan-crocoder',
              authorExternalId: 5000
            },
            {
              externalId: 4001,
              mergeRequestId: mergeRequest.id,
              createdAt: new Date(),
              updatedAt: new Date(),
              authorUsername: 'Ante-Koceic',
              authorExternalId: 5001
            }
          ]
        });
      default:
        return Promise.reject(new Error('Are you mocking me?'));
    }
  });

  context = {
    db,
    entities: {
      mergeRequestNotes,
      mergeRequests,
      namespaces,
      repositories
    },
    integrations: {
      sourceControl: { fetchMergeRequestNotes }
    }
  }
});

afterAll(async () => {
  betterSqlite.close();
  await unlink(databaseName);
});

describe('get-merge-request-diffs:', () => {
  describe('getMergeRequestDiffs', () => {
    test('should insert merge request note data in the db', async () => {
      const { mergeRequestNotes } = await getMergeRequestNotes({
        mergeRequestId: TEST_MERGE_REQUEST_1.id,
        namespaceId: TEST_NAMESPACE_1.id,
        repositoryId: TEST_REPO_1.id,
      }, context);

      expect(mergeRequestNotes).toBeDefined();
      expect(fetchMergeRequestNotes).toHaveBeenCalledTimes(1);

      const mergeRequesNoteRows = db.select().from(context.entities.mergeRequestNotes).all();
      expect(mergeRequesNoteRows).toHaveLength(2);

      for(const mergeRequestNoteRow of mergeRequesNoteRows) {
        const extractedMergeRequestNote = mergeRequestNotes.find((mergeRequestNote)=>
        mergeRequestNote.externalId === mergeRequestNoteRow.externalId);
        
        expect(extractedMergeRequestNote).toBeDefined();
        expect(extractedMergeRequestNote?.id).toBeDefined();
      }
    });
  });
});
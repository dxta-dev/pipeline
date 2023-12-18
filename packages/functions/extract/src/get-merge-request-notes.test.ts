
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from '@libsql/client';

import { describe, expect, test } from '@jest/globals';
import { getMergeRequestNotes } from './get-merge-request-notes';

import { members, mergeRequestNotes, mergeRequests, namespaces, repositories, repositoriesToMembers } from "@acme/extract-schema";
import type { MergeRequest, Namespace, NewMergeRequest, NewNamespace, NewRepository, Repository } from "@acme/extract-schema";
import type { Context } from './config';
import type { GetMergeRequestNotesSourceControl, GetMergeRequestNotesEntities } from './get-merge-request-notes';
import fs from 'fs';

let sqlite: ReturnType<typeof createClient>;
let db: ReturnType<typeof drizzle>;
let context: Context<GetMergeRequestNotesSourceControl, GetMergeRequestNotesEntities>;
let fetchMergeRequestNotes: jest.MockedFunction<GetMergeRequestNotesSourceControl['fetchMergeRequestNotes']>;

const TEST_NAMESPACE_1 = { id: 1, externalId: 2000, name: 'TEST_NAMESPACE_NAME', forgeType: 'github' } satisfies NewNamespace;
const TEST_REPO_1 = { id: 1, externalId: 1000, name: 'TEST_REPO_NAME', forgeType: 'github', namespaceId: 1 } satisfies NewRepository;
const TEST_MERGE_REQUEST_1 = { id: 1, externalId: 3000, createdAt: new Date(), canonId: 1, repositoryId: 1, title: "TEST_MR", webUrl: "localhost" } satisfies NewMergeRequest;

const dbname = 'get-merge-request-notes';

beforeAll(async () => {
  sqlite = createClient({
    url: `file:${dbname}`,
  });
  db = drizzle(sqlite);

  await migrate(db, { migrationsFolder: "../../../migrations/tenant-db" });
  await db.insert(namespaces).values([TEST_NAMESPACE_1]).run();
  await db.insert(repositories).values([TEST_REPO_1]).run();
  await db.insert(mergeRequests).values([TEST_MERGE_REQUEST_1]).run();

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
              authorExternalId: 5000,
              body: '',
              system: false,
            },
            {
              externalId: 4001,
              mergeRequestId: mergeRequest.id,
              createdAt: new Date(),
              updatedAt: new Date(),
              authorUsername: 'Ante-Koceic',
              authorExternalId: 5001,
              body: '',
              system: false,
            },
            {
              externalId: 4002,
              mergeRequestId: mergeRequest.id,
              createdAt: new Date(),
              updatedAt: new Date(),
              authorUsername: 'dejan-crocoder',
              authorExternalId: 5000,
              body: '',
              system: false,
            },
          ]
        });
      default:
        return Promise.reject(new Error('Are you mocking me?'));
    }
  });

  context = {
    db,
    entities: {
      members,
      mergeRequestNotes,
      mergeRequests,
      namespaces,
      repositories,
      repositoriesToMembers,
    },
    integrations: {
      sourceControl: { fetchMergeRequestNotes }
    }
  }
});

afterAll(() => {
  sqlite.close();
  fs.unlinkSync(dbname);
});

describe('get-merge-request-notes:', () => {
  describe('getMergeRequestNotes', () => {
    test('should insert merge request note data in the db', async () => {
      const { mergeRequestNotes, members } = await getMergeRequestNotes({
        mergeRequestId: TEST_MERGE_REQUEST_1.id,
        namespaceId: TEST_NAMESPACE_1.id,
        repositoryId: TEST_REPO_1.id,
      }, context);

      expect(mergeRequestNotes).toBeDefined();
      expect(fetchMergeRequestNotes).toHaveBeenCalledTimes(1);

      const mergeRequesNoteRows = await db.select().from(context.entities.mergeRequestNotes).all();
      expect(mergeRequesNoteRows).toHaveLength(3);

      for (const mergeRequestNoteRow of mergeRequesNoteRows) {
        const extractedMergeRequestNote = mergeRequestNotes.find((mergeRequestNote) =>
          mergeRequestNote.externalId === mergeRequestNoteRow.externalId);

        expect(extractedMergeRequestNote).toBeDefined();
        expect(extractedMergeRequestNote?.id).toBeDefined();
      }

      expect(members).toBeDefined();
      const memberRows = await db.select().from(context.entities.members).all();
      expect(memberRows).toHaveLength(2);
      for (const memberRow of memberRows) {
        const extractedMember = members.find(member => member.externalId === memberRow.externalId);
        expect(extractedMember).toBeDefined();
        expect(extractedMember?.id).toBeDefined();
        expect(extractedMember?.username).toBeDefined();
      }
    });
  });
});

import type * as extract from '@acme/extract-schema';
import * as transform from '@acme/transform-schema';
import type { Database } from './config';
import { sql } from "drizzle-orm";
import { SQLiteSelect } from 'drizzle-orm/sqlite-core';

function upsertRepositoryDimension(db: Database, repo: transform.NewRepository) {
  return db.insert(transform.repositories)
    .values(repo)
    .onConflictDoUpdate({
      target: [
        transform.repositories.externalId,
        transform.repositories.forgeType
      ],
      set: {
        name: repo.name,
        _updatedAt: sql`(strftime('%s', 'now'))`,
      },
    });
}

function upsertMergeRequestDimension(db: Database, mergeRequest: transform.NewMergeRequest) {
  return db.insert(transform.mergeRequests)
    .values(mergeRequest)
    .onConflictDoUpdate({
      target: [
        transform.mergeRequests.externalId,
        transform.mergeRequests.forgeType
      ],
      set: {
        title: mergeRequest.title,
        webUrl: mergeRequest.webUrl,
        _updatedAt: sql`(strftime('%s', 'now'))`,
      }
    })
}

function upsertForgeUser(db: Database, forgeUser: transform.NewForgeUser) {
    return db.insert(transform.forgeUsers)
      .values(forgeUser)
      .onConflictDoUpdate({
        target: [
          transform.forgeUsers.externalId,
          transform.forgeUsers.forgeType,
        ],
        set: {
          name: forgeUser.name,
          _updatedAt: sql`(strftime('%s', 'now'))`,
        }
      })
}

function insertUserJunk(_db: Database, _users: any): SQLiteInsert<any> {
  throw new Error('Not implemented');
}

function updateUserJunk(_db: Database, _users: any): SQLiteUpdate<any> {
  throw new Error('Not implemented');
}

function insertDateJunk(_db: Database, _dates: any): SQLiteInsert<any> {
  throw new Error('Not implemented');
}

function updateDateJunk(_db: Database, _dates: any): SQLiteUpdate<any> {
  throw new Error('Not implemented');
}

function selectDates(_db: Database, _dates: any): SQLiteSelect<any> {
  throw new Error('Not implemented');
}

function selectExtractData(_db: Database, _extractMergeRequestId: number): any {
  throw new Error('Not implemented');
}

export type RunContext = {
  extractDB: Database;
  transformDB: Database;
};

export async function run(extractMergeRequestId: number, ctx: RunContext) {
  const extractData = await selectExtractData(ctx.extractDB, extractMergeRequestId);
}


import type * as extract from '@acme/extract-schema';
import * as transform from '@acme/transform-schema';
import { sql } from "drizzle-orm";
import { SQLiteSelect } from 'drizzle-orm/sqlite-core';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';

type BrandedDatabase<T> =  LibSQLDatabase<Record<string, unknown>> & { __brand: T }

export type TransformDatabase = BrandedDatabase<'transform'>;
export type ExtractDatabase = BrandedDatabase<'extract'>;



function insertMergeMetrics(db: TransformDatabase, mergeMetrics: transform.NewMergeMetrics): SQLiteInsert<any> {
  throw new Error('Not implemented');
}

function upsertRepository(db: TransformDatabase, repo: transform.NewRepository) {
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

function upsertMergeRequest(db: TransformDatabase, mergeRequest: transform.NewMergeRequest) {
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

function upsertForgeUser(db: TransformDatabase, forgeUser: transform.NewForgeUser) {
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

function insertUserJunk(_db: TransformDatabase, _users: any): SQLiteInsert<any> {
  throw new Error('Not implemented');
}

function updateUserJunk(_db: TransformDatabase, _users: any): SQLiteUpdate<any> {
  throw new Error('Not implemented');
}

function insertDateJunk(_db: TransformDatabase, _dates: any): SQLiteInsert<any> {
  throw new Error('Not implemented');
}

function updateDateJunk(_db: TransformDatabase, _dates: any): SQLiteUpdate<any> {
  throw new Error('Not implemented');
}

function selectDates(_db: TransformDatabase, _dates: any): SQLiteSelect<any> {
  throw new Error('Not implemented');
}

function selectExtractData(_db: ExtractDatabase, _extractMergeRequestId: number): any {
  throw new Error('Not implemented');
}

export type RunContext = {
  extractDatabase: ExtractDatabase;
  transformDatabase: TransformDatabase;
};

export async function run(extractMergeRequestId: number, ctx: RunContext) {
  const extractData = await selectExtractData(ctx.extractDatabase, extractMergeRequestId);
}


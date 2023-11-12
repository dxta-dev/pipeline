import * as extract from '@acme/extract-schema';
import * as transform from '@acme/transform-schema';
import { sql, eq } from "drizzle-orm";
import type { LibSQLDatabase } from 'drizzle-orm/libsql';

type BrandedDatabase<T> = LibSQLDatabase<Record<string, unknown>> & { __brand: T }

export type TransformDatabase = BrandedDatabase<'transform'>;
export type ExtractDatabase = BrandedDatabase<'extract'>;

function _insertMergeMetrics(_db: TransformDatabase, _mergeMetrics: transform.NewMergeRequestMetric): any {
  throw new Error('Not implemented');
}

function _upsertRepository(db: TransformDatabase, repo: transform.NewRepository) {
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

function _upsertMergeRequest(db: TransformDatabase, mergeRequest: transform.NewMergeRequest) {
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

function _upsertForgeUser(db: TransformDatabase, forgeUser: transform.NewForgeUser) {
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

function _insertUserJunk(_db: TransformDatabase, _users: any): any {
  throw new Error('Not implemented');
}

function _updateUserJunk(_db: TransformDatabase, _users: any): any {
  throw new Error('Not implemented');
}

function _insertDateJunk(_db: TransformDatabase, _dates: any): any {
  throw new Error('Not implemented');
}

function _updateDateJunk(_db: TransformDatabase, _dates: any): any {
  throw new Error('Not implemented');
}

function _selectDates(_db: TransformDatabase, _dates: any): any {
  throw new Error('Not implemented');
}

async function selectExtractData(db: ExtractDatabase, extractMergeRequestId: number) {
  const { mergeRequests, repositories, mergeRequestDiffs, timelineEvents, mergeRequestNotes } = extract;
  return await db.select({
    mergeRequestId: mergeRequests.id,
  })
    .from(mergeRequests)
    .innerJoin(repositories, eq(mergeRequests.repositoryId, repositories.id))
    .innerJoin(mergeRequestDiffs, eq(mergeRequests.id, mergeRequestDiffs.mergeRequestId))
    .innerJoin(timelineEvents, eq(mergeRequests.id, timelineEvents.mergeRequestId))
    .innerJoin(mergeRequestNotes, eq(mergeRequests.id, mergeRequestNotes.mergeRequestId))
    .where(eq(mergeRequests.id, extractMergeRequestId))
    .get();
}

export type RunContext = {
  extractDatabase: ExtractDatabase;
  transformDatabase: TransformDatabase;
};

export async function run(extractMergeRequestId: number, ctx: RunContext) {
  const extractData = await selectExtractData(ctx.extractDatabase, extractMergeRequestId);
  console.log(extractData);
}


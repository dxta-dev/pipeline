import * as extract from '@acme/extract-schema';
import * as transform from '@acme/transform-schema';
import { sql, eq } from "drizzle-orm";
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import { isCodeGen } from './is-codegen';
import { parseHunks } from './parse-hunks';

type BrandedDatabase<T> = LibSQLDatabase<Record<string, unknown>> & { __brand: T }

export type TransformDatabase = BrandedDatabase<'transform'>;
export type ExtractDatabase = BrandedDatabase<'extract'>;

function insertMergeMetrics(_db: TransformDatabase, _mergeMetrics: transform.NewMergeRequestMetric): any {
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

function calculateMrSize(mergeRequestId: number, diffs: { stringifiedHunks: string, newPath: string }[]): number | null {
  if (diffs.length === 0) {
    console.error(new Error(`No extracted merge request diffs found for ids: ${mergeRequestId}`));
    return null;
  }

  let mrSize = 0;

  for (const diff of diffs) {


    const codeGenResult = isCodeGen(diff.newPath);

    if (codeGenResult === true) {
      console.error(new Error(`This file is part of codeGen: ${diff.newPath} on merge request with id: ${mergeRequestId}`));
      continue;
    }

    mrSize += parseHunks(diff.stringifiedHunks)
      .map(({ additions, deletions }) => additions + deletions)
      .reduce((a, b) => a + b, 0);
  }


  return mrSize;
}

async function selectExtractData(db: ExtractDatabase, extractMergeRequestId: number) {
  const { mergeRequests, mergeRequestDiffs } = extract;
  const extractData = await db.select({
    diffs: {
      stringifiedHunks: mergeRequestDiffs.diff,
      newPath: mergeRequestDiffs.newPath,
    },
  })
    .from(mergeRequests)
    .leftJoin(mergeRequestDiffs, eq(mergeRequests.id, mergeRequestDiffs.mergeRequestId))
    .where(eq(mergeRequests.id, extractMergeRequestId))
    .all();

  if (!extractData) {
    return null;
  }

  return extractData;
}

export type RunContext = {
  extractDatabase: ExtractDatabase;
  transformDatabase: TransformDatabase;
};

export async function run(extractMergeRequestId: number, ctx: RunContext) {
  const extractData = await selectExtractData(ctx.extractDatabase, extractMergeRequestId);

  if (!extractData) {
    console.error(`No extract data found for merge request with id ${extractMergeRequestId}`);
    return null;
  }

  const _mrSize = calculateMrSize(extractMergeRequestId, extractData.map(({ diffs }) => diffs).filter(Boolean));

  /*
  insertMergeMetrics(ctx.transformDatabase, {
    mrSize: mrSize || -1,
  });
  */

}


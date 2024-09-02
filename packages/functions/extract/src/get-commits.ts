import type { NewCommit, Commit, Namespace, Repository, Sha, NewShaTreeNode } from "@dxta/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { Pagination, SourceControl, TimePeriod } from "@dxta/source-control";
import { sql } from "drizzle-orm";

export type GetCommitsInput = {
  namespace: Namespace;
  repository: Repository;
  timePeriod?: TimePeriod;
  ref?: string;
  page?: number;
  perPage: number;
}

export type GetCommitsOutput = {
  commits: Commit[];
  paginationInfo: Pagination;
}

export type GetCommitsSourceControl = Pick<SourceControl, 'fetchCommits'>;
export type GetCommitsEntities = Pick<Entities, 'commits' | 'repositoryShaTrees' | 'repositoryShas'>;

export type GetCommitsFunction = ExtractFunction<GetCommitsInput, GetCommitsOutput, GetCommitsSourceControl, GetCommitsEntities>;

export const getCommits: GetCommitsFunction = async (
  { namespace, repository, ref, timePeriod, perPage, page },
  { db, entities, integrations }
) => {

  if (!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }

  const { commits: commitData, pagination } = await integrations.sourceControl.fetchCommits(repository, namespace, perPage, ref, timePeriod, page);

  if (commitData.length === 0 && pagination.totalPages === 1) return {
    commits: [],
    paginationInfo: pagination
  }

  const uniqueCommitShas = Array.from(
    new Set([
      ...commitData.map(x => [x.id, ...x.parents]).flat(),
    ]).values()
  );

  const insertedShas = await db.transaction(async (tx) => {
    return Promise.all(
      uniqueCommitShas.map(commitSha =>
        tx.insert(entities.repositoryShas).values({ repositoryId: repository.id, sha: commitSha })
          .onConflictDoUpdate({
            target: [entities.repositoryShas.repositoryId, entities.repositoryShas.sha],
            set: { _updatedAt: sql`(strftime('%s', 'now'))` },
          })
          .returning()
          .get()
      )
    );
  });

  const shaIdMap = insertedShas.reduce((map, sha) => map.set(sha.sha, sha.id), new Map<string, Sha['id']>());

  const shaTreeNodeList = commitData.map(data => data.parents.map(parent => ({
    parentId: shaIdMap.get(parent) as number,
    shaId: shaIdMap.get(data.id) as number,
  } satisfies NewShaTreeNode))).flat();

  await db.insert(entities.repositoryShaTrees).values(shaTreeNodeList).onConflictDoNothing().run();

  const newCommits: NewCommit[] = commitData.map(x => ({
    repositoryId: repository.id,
    repositoryShaId: shaIdMap.get(x.id) as number,
    authoredAt: x.commit.authoredAt,
    committedAt: x.commit.committedAt,
  } satisfies NewCommit));

  const insertedCommits = await db.transaction(async (tx) => {
    return Promise.all(
      newCommits.map(commit =>
        tx.insert(entities.commits).values(commit).onConflictDoUpdate({
          target: [entities.commits.repositoryShaId],
          set: {
            authoredAt: commit.authoredAt,
            committedAt: commit.committedAt,
            _updatedAt: sql`(strftime('%s', 'now'))`,
          }
        })
          .returning()
          .get()
      )
    );
  });

  return {
    commits: insertedCommits,
    paginationInfo: pagination
  }
}
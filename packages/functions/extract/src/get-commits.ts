import { type NewCommit, type Commit, type Namespace, type Repository, type NewCommitChild, type Sha } from "@dxta/extract-schema";
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
export type GetCommitsEntities = Pick<Entities, 'commits' | 'commitsChildren' | 'repositoryShas'>;

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

  const firstLevelCommitSet = new Set(commitData.map(x => x.id));
  const uniqueParentCommitSet = new Set(commitData.map(x => x.parents).flat());
  const parentPartialCommitIds = Array.from(uniqueParentCommitSet.values()).filter(x => !firstLevelCommitSet.has(x));

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

  const newCommits: NewCommit[] = [
    ...commitData.map(x => ({
      repositoryId: repository.id,
      repositoryShaId: shaIdMap.get(x.id) as number,
      authoredAt: x.commit.authoredAt,
      committedAt: x.commit.committedAt,
    } satisfies NewCommit)),
    ...parentPartialCommitIds.map(sha => ({
      repositoryId: repository.id,
      repositoryShaId: shaIdMap.get(sha) as number,
    } satisfies NewCommit))
  ];

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

  const shaIdToCommitIdMap = insertedCommits.reduce((map, commit) => map.set(commit.repositoryShaId, commit.id), new Map<Commit['repositoryShaId'], Commit['id']>());

  const commitChildren: NewCommitChild[] = [];
  for (const data of commitData) {
    for (const parent of data.parents) {
      const commitId = shaIdToCommitIdMap.get(shaIdMap.get(data.id) as number) as number;
      const parentId = shaIdToCommitIdMap.get(shaIdMap.get(parent) as number) as number;
      commitChildren.push({
        commitId,
        parentId
      });
    }
  };

  await db.insert(entities.commitsChildren).values(commitChildren).onConflictDoNothing().run();

  return {
    commits: insertedCommits,
    paginationInfo: pagination
  }
}
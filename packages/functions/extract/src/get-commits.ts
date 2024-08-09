import type { NewCommit, Commit, Namespace, Repository, NewCommitChild } from "@dxta/extract-schema";
import { marshalSha, unmarshalSha } from "@dxta/extract-schema";
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
export type GetCommitsEntities = Pick<Entities, 'commits' | 'commitsChildren'>;

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

  const partialCommits = parentPartialCommitIds.map(x => ({
    repositoryId: repository.id,
    ...marshalSha(x),
  }) satisfies NewCommit);

  const insertedCommits = await db.transaction(async (tx) => {
    return Promise.all([
      ...commitData.map(data =>
        tx.insert(entities.commits).values(data.commit)
          .onConflictDoUpdate({
            target: [
              entities.commits.repositoryId,
              entities.commits.sha0,
              entities.commits.sha1,
              entities.commits.sha2,
              entities.commits.sha3,
              entities.commits.sha4,
            ],
            set: {
              authoredAt: data.commit.authoredAt,
              committedAt: data.commit.committedAt,
              _updatedAt: sql`(strftime('%s', 'now'))`,
            }
          })
          .returning()
          .get()
      ),
      ...partialCommits.map(commit =>
        tx.insert(entities.commits).values(commit)
          .onConflictDoUpdate({
            target: [
              entities.commits.repositoryId,
              entities.commits.sha0,
              entities.commits.sha1,
              entities.commits.sha2,
              entities.commits.sha3,
              entities.commits.sha4,
            ],
            set: {
              _updatedAt: sql`(strftime('%s', 'now'))`,
            }
          })
          .returning()
          .get()
      ),
    ])
  });

  const commitShaIdMap = insertedCommits.reduce((map, commit) => map.set(unmarshalSha(commit), commit.id), new Map<string, Commit['id']>());

  const commitChildren: NewCommitChild[] = [];
  for (const data of commitData) {
    for (const parent of data.parents) {
      const commitId = commitShaIdMap.get(data.id);
      const parentId = commitShaIdMap.get(parent);
      if (!commitId) {
        console.log(new Error(`Possible failed insertion of commit with sha ${data.id}`));
        continue;
      }
      if (!parentId) {
        console.log(new Error(`Possible failed insertion of commit with sha: ${parent} which is the parent of ${data.id}`));
        continue;
      }
      commitChildren.push({
        commit: commitId,
        childOf: parentId
      });
    }
  };

  await db.insert(entities.commitsChildren).values(commitChildren).onConflictDoNothing().run();

  return {
    commits: insertedCommits,
    paginationInfo: pagination
  }
}
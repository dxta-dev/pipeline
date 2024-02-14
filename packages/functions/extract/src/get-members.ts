import type { Member } from "@dxta/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { Pagination, SourceControl } from "@dxta/source-control";
import { sql } from "drizzle-orm";

export type GetMembersInput = {
  externalRepositoryId: number;
  namespaceName: string;
  repositoryName: string;
  repositoryId: number;
  page?: number;
  perPage: number;
};

export type GetMembersOutput = {
  members: Member[];
  paginationInfo: Pagination;
};

export type GetMembersSourceControl = Pick<SourceControl, "fetchMembers">;
export type GetMembersEntities = Pick<Entities, "members" | "repositoriesToMembers">;

export type GetMembersFunction = ExtractFunction<GetMembersInput, GetMembersOutput, GetMembersSourceControl, GetMembersEntities>;

export const getMembers: GetMembersFunction = async (
  { externalRepositoryId, namespaceName, repositoryName, repositoryId, perPage, page },
  { integrations, db, entities }
) => {

  if (!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }

  const { members, pagination } = await integrations.sourceControl.fetchMembers(externalRepositoryId, namespaceName, repositoryName, perPage, page);

  if (members.length === 0 && pagination.totalPages === 1) return {
    members: [],
    paginationInfo: pagination,
  }

  const insertedMembers = await db.transaction(async (tx) => {
    return Promise.all(members.map(member =>
      tx.insert(entities.members).values(member)
        .onConflictDoUpdate({
          target: [
            entities.members.externalId,
            entities.members.forgeType
          ],
          set: {
            username: member.username,
            _updatedAt: sql`(strftime('%s', 'now'))`,
          }
        })
        .returning()
        .get()
    ));
  });

  // Issue: no way to know if passed repositoryId is correct
  await db.insert(entities.repositoriesToMembers)
    .values(insertedMembers.map(member => ({ memberId: member.id, repositoryId })))
    .onConflictDoNothing()
    .run();

  return {
    members: insertedMembers,
    paginationInfo: pagination,
  };
};

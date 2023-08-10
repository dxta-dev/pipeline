import type { Member } from "@acme/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { Pagination, SourceControl } from "@acme/source-control";

export type GetMembersInput = {
  externalRepositoryId: number;
  namespaceName: string;
  repositoryName: string;
  repositoryId: number;
  page?: number;
  perPage?: number;
};

export type GetMembersOutput = {
  members: Member[];
  paginationInfo: Pagination;
};

export type GetMembersSourceControl = Pick<SourceControl, "fetchMembers">;
export type GetMembersEntities = Pick<Entities, "members" | "repositoriesToMembers">;

export type GetMembersFunction = ExtractFunction<GetMembersInput, GetMembersOutput, GetMembersSourceControl, GetMembersEntities>;

export const getMembers: GetMembersFunction = async (
  { externalRepositoryId, namespaceName, repositoryName, repositoryId },
  { integrations, db, entities }
) => {

  if (!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }

  const { members, pagination } = await integrations.sourceControl.fetchMembers(externalRepositoryId, namespaceName, repositoryName);

  const insertedMembers = await db.insert(entities.members).values(members)
    .onConflictDoNothing({ target: entities.members.externalId }).returning()
    .all();

  // Issue: no way to know if passed repositoryId is correct
  await db.insert(entities.repositoriesToMembers)
    .values(insertedMembers.map(member => ({ memberId: member.id, repositoryId })))
    .onConflictDoNothing()
    .all();

  return {
    members: insertedMembers,
    paginationInfo: pagination,
  };
};

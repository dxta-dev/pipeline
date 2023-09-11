import type { Member } from "@acme/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { SourceControl } from "@acme/source-control";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";

export type GetMemberInfoInput = {
  memberId: number;
};

export type GetMemberInfoOutput = {
  member: Member;
};

export type GetMemberInfoSourceControl = Pick<SourceControl, "fetchUserInfo">;
export type GetMemberInfoEntities = Pick<Entities, "members">;

export type GetMemberInfoFunction = ExtractFunction<GetMemberInfoInput, GetMemberInfoOutput, GetMemberInfoSourceControl, GetMemberInfoEntities>;

export const getMemberInfo: GetMemberInfoFunction = async (
  { memberId },
  { integrations, db, entities }
) => {

  if (!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }

  const member = await db.select({ username: entities.members.username }).from(entities.members).where(eq(entities.members.id, memberId)).get();

  if (!member) {
    console.error(`Member ${memberId} not found`);
    throw new Error(`Member ${memberId} not found`);
  }

  const { member: fetchedMember } = await integrations.sourceControl.fetchUserInfo(member.username);

  const insertedMember = await (db as LibSQLDatabase & BetterSQLite3Database)
    .update(entities.members)
    .set(fetchedMember)
    .where(eq(entities.members.id, memberId))
    .returning()
    .get()


  return {
    member: insertedMember,
  };
};

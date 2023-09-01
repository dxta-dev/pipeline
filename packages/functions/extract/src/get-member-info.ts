import type { Member } from "@acme/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { SourceControl } from "@acme/source-control";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";

export type GetUserInfoInput = {
  memberId: number;
};

export type GetUserInfoOutput = {
  member: Member;
};

export type GetUserInfoSourceControl = Pick<SourceControl, "fetchUserInfo">;
export type GetUserInfoEntities = Pick<Entities, "members">;

export type GetUserInfoFunction = ExtractFunction<GetUserInfoInput, GetUserInfoOutput, GetUserInfoSourceControl, GetUserInfoEntities>;

export const getUserInfo: GetUserInfoFunction = async (
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

  console.log(fetchedMember);

  const insertedMember = await (db as LibSQLDatabase & BetterSQLite3Database).update(entities.members).set(fetchedMember)
    .returning()
    .get()


  return {
    member: insertedMember,
  };
};

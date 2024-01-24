import type { Member } from "@acme/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { SourceControl } from "@acme/source-control";
import { eq, sql } from "drizzle-orm";

export type GetMemberInfoInput = {
  memberId: number;
};

export type GetMemberInfoOutput = {
  member: Member;
};

export type GetMemberInfoSourceControl = Pick<SourceControl, "fetchUserInfo">;
export type GetMemberInfoEntities = Pick<Entities, "members">;

export type GetMemberInfoFunction = ExtractFunction<GetMemberInfoInput, GetMemberInfoOutput, GetMemberInfoSourceControl, GetMemberInfoEntities>;

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

export const getMemberInfo: GetMemberInfoFunction = async (
  { memberId },
  { integrations, db, entities }
) => {

  if (!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }

  const member = await db.select().from(entities.members).where(eq(entities.members.id, memberId)).get();

  if (!member) {
    console.error(`Member ${memberId} not found`);
    throw new Error(`Member ${memberId} not found`);
  }

  const now = new Date();
  const memberInfoAge = now.getTime() - (member._extractedAt?.getTime() || 0)

  if (memberInfoAge < TWELVE_HOURS) {
    console.log("Member info is up to date");
    return {
      member,
    };
  }

  console.time("getMemberInfo:fetch");
  const { member: fetchedMember } = await integrations.sourceControl.fetchUserInfo(member.externalId, member.username);
  console.timeEnd("getMemberInfo:fetch");

  const insertedMember = await db.update(entities.members)
    .set({
      ...fetchedMember,
      _updatedAt: sql`(strftime('%s', 'now'))`,
      _extractedAt: sql`(strftime('%s', 'now'))`,
    })
    .where(eq(entities.members.id, memberId))
    .returning()
    .get()


  return {
    member: insertedMember,
  };
};

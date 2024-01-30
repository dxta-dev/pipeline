import type { Member } from "@acme/extract-schema";
import type { ExtractFunction, Entities } from "./config";
import type { SourceControl } from "@acme/source-control";
import { eq, sql } from "drizzle-orm";

export type GetMemberInfoInput = {
  memberId: number;
  maxAgeMs?: number;
  currentTime?: number;
};

export type GetMemberInfoOutput = {
  member?: Member;
};

export type GetMemberInfoSourceControl = Pick<SourceControl, "fetchUserInfo">;
export type GetMemberInfoEntities = Pick<Entities, "members">;

export type GetMemberInfoFunction = ExtractFunction<GetMemberInfoInput, GetMemberInfoOutput, GetMemberInfoSourceControl, GetMemberInfoEntities>;

export const shouldGetMemberInfo = (member: Pick<Member, '_extractedAt'>,
  maxAgeMs = 12 * 60 * 60 * 1000,
  currentTimeMs = Date.now()) => member._extractedAt === null 
  || currentTimeMs > (member._extractedAt.getTime() + maxAgeMs);

export const getMemberInfo: GetMemberInfoFunction = async (
  { memberId, maxAgeMs, currentTime },
  { integrations, db, entities }
) => {

  if (!integrations.sourceControl) {
    throw new Error("Source control integration not configured");
  }

  const member = await db.select({ 
    externalId: entities.members.externalId, 
    username: entities.members.username,
    _extractedAt: entities.members._extractedAt,
   }).from(entities.members).where(eq(entities.members.id, memberId)).get();

  if (!member) {
    console.error(`Member ${memberId} not found`);
    throw new Error(`Member ${memberId} not found`);
  }

  if (!shouldGetMemberInfo(member, maxAgeMs, currentTime)) return {};

  const { member: fetchedMember } = await integrations.sourceControl.fetchUserInfo(member.externalId, member.username);

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

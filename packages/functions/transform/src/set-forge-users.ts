import { inArray } from "drizzle-orm";
import type { ExtractEntities, TransformEntities, TransformFunction } from "./config";
import type { NewForgeUser } from "@acme/transform-schema";
import { sql } from "drizzle-orm";
import { isMemberKnownBot } from "./known-bots";

export type SetForgeUsersInput = {
  extractMemberIds?: number[];
}
export type SetForgeUsersOutput = void;
export type SetForgeUsersExtractEntities = Pick<ExtractEntities, 'members'>;
export type SetForgeUsersTransformEntities = Pick<TransformEntities, 'forgeUsers'>;

export type SetForgeUsersFunction = TransformFunction<SetForgeUsersInput, SetForgeUsersOutput, SetForgeUsersExtractEntities, SetForgeUsersTransformEntities>;

export const setForgeUsers: SetForgeUsersFunction = async (
  { extractMemberIds },
  { extract, transform }
) => {

  if (!extractMemberIds) return;

  const extractForgeUsers = (await extract.db.select({
    externalId: extract.entities.members.externalId,
    forgeType: extract.entities.members.forgeType,
    name: extract.entities.members.name,
    username: extract.entities.members.username,
  }).from(extract.entities.members)
    .where(inArray(extract.entities.members.id, extractMemberIds))
    .all()).map(user => ({
      ...user,
      name: user.name || user.username,
      bot: isMemberKnownBot(user.forgeType, user),
    })) satisfies NewForgeUser[];

  if (extractForgeUsers.length === 0) {
    console.error(new Error(`No extracted forge users found for ids: ${extractMemberIds}`));
    return;
  }

  const queries = extractForgeUsers.map(
    forgeUser => transform.db.insert(transform.entities.forgeUsers)
      .values(forgeUser)
      .onConflictDoUpdate({
        target: [
          transform.entities.forgeUsers.externalId,
          transform.entities.forgeUsers.forgeType
        ],
        set: {
          name: forgeUser.name,
          _updatedAt: sql`(strftime('%s', 'now'))`,
        }
      })
  );

  type Query = typeof queries[number];

  await transform.db.batch(
    queries as [Query, ...Query[]]
  );
}

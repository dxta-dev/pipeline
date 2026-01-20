import { shouldGetMemberInfo } from "@dxta/extract-functions";
import type { Member } from "@dxta/extract-schema";

export const filterNewExtractMembers = (
  members: Member[],
  maxAgeMs?: number,
  currentTime?: number,
) =>
  members.filter((member) =>
    shouldGetMemberInfo(member, maxAgeMs, currentTime),
  );

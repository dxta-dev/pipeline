import { shouldGetMemberInfo } from "@acme/extract-functions";
import type { Member } from "@acme/extract-schema";

export const filterNewExtractMembers = (members: Member[], maxAgeMs?: number, currentTime?: number) => members.filter(member => shouldGetMemberInfo(member, maxAgeMs, currentTime));

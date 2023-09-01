import type { GitIdentities, Member } from "@acme/extract-schema";
import Fuse from "fuse.js";

interface MemberToGitIdentity {
  gitIdentityId: number,
  memberId: number,
}

const extractUserFromEmail = (email: string) => {
  const [name] = email.split('@');
  return name;
};

export function fuzzySearch(gitIdentities: GitIdentities[], members: Member[]): MemberToGitIdentity[]{
  const identities = gitIdentities.map((identity) => {
    const name = extractUserFromEmail(identity.email);
    return { name: name, username: identity.name };
  });
  const fuse = new Fuse(identities, {
    keys: ['username', 'name'],
    threshold: 0.2,
    location: 0,
    distance: 100,
    includeScore: true,
    useExtendedSearch: true,
  });
  
  const resultArray: Array<MemberToGitIdentity> = [];
  for(let i = 0; i < members.length; i++) {
    const result = fuse.search(`${members[i]?.name.replace(' ', '|')}|${members[i]?.username.replace(' ', '|')}`, { limit: 5 });
    for (let j = 0; j < result.length; j++) {
      if (result[j]?.refIndex !== undefined) {
        const singleResult = {
          memberId: members[i]?.id as number,
          gitIdentityId: gitIdentities[result[j]?.refIndex as number]?.id as number,
        }
        resultArray.push(singleResult)
      }
    }
  }
  return resultArray;
}

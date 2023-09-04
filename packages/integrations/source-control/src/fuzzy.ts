import type { GitIdentities, Member } from "@acme/extract-schema";
import Fuse from "fuse.js";

const extractUserFromEmail = (email: string | null) => {
  if (email) {
    const [name] = email.split('@');
    return name;
  }
  return '';
};

export function fuzzySearch(gitIdentities: GitIdentities[], members: Member[]) {
  const identities = gitIdentities.map((identity) => {
    const userName = extractUserFromEmail(identity.email);
    return { name: identity.name, username: userName };
  });
  
  const fuse = new Fuse(identities, {
    keys: ['username', 'name'],
    threshold: 0.2,
    location: 0,
    distance: 100,
    includeScore: true,
    useExtendedSearch: true,
  });
  
  const resultArray = [];
  for(let i = 0; i < members.length; i++) {
    const member = members[i]!;
    const searchName = member.name ? member.name.replace(' ', '|') : null
    const searchUserName = member.username ? member.username.replace(' ', '|') : null;
    const result = fuse.search([searchName, searchUserName].filter(t => t !== null).join('|'), { limit: 5 });
    
    resultArray.push({
      memberId: member.id,
      result,
    });
  }
  console.log(JSON.stringify(resultArray, null, 2));
  return resultArray;
}

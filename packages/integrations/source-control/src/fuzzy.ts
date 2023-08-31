import type { GitIdentities, Member } from "@acme/extract-schema";
import Fuse from "fuse.js";

const extractUserFromEmail = (email: string) => {
  const [name] = email.split('@');
  return name;
};

export function fuzzySearch(gitIdentities: GitIdentities[], members: Member[]): void{
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
  
  for(let i = 0; i < members.length; i++) {
    const result = fuse.search(`${members[i]!.name.replace(' ', '|')}|${members[i]!.username.replace(' ', '|')}`, { limit: 5 });
    console.log(members[i]!.name, members[i]!.username, { result });
  }  
}


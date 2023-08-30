import Fuse from "fuse.js";

// JUST FOR TESTING
interface GitIdentities {
  id: number,
  repositoryId: number,
  email: string,
  name: string,
}

// JUST FOR TESTING
interface Member {
  id: number,
  externalId: number,
  name: string,
  username: string,
}

interface GitIdentitiesToMember {
  memberId: number | undefined,
  gitIdentityId: number | undefined,
}

// JUST FOR TESTING
const gitIdentities: Array<GitIdentities> = [
  { id: 1, repositoryId: 1, email: 'ante@crocoder.dev', name: 'Ante Koceić' },
  { id: 2, repositoryId: 1, email: 'david@crocoder.dev', name: 'David Abram' },
  { id: 3, repositoryId: 1, email: 'ivek@crocoder.dev', name: 'Ivan Ivic' },
  { id: 4, repositoryId: 1, email: 'ivan@crocoder.dev', name: 'Ivan Penga' },
];

// JUST FOR TESTING
const members: Array<Member> = [
  { id: 1, externalId: 10978413, name: 'David Abram', username: 'davidabram' },
  { id: 2, externalId: 12518222, name: 'Ante Koceić', username: 'ante10' },
  { id: 3, externalId: 14663566, name: 'ci-cd-test-token', username: 'project_44247924_bot_8a64bd1c92489f26164da69310605f2d' },
  { id: 4, externalId: 15085492, name: 'ivan', username: 'project_44247924_bot_5c797a08301e64e51dbc72fa8d29653f' },
  { id: 5, externalId: 15096039, name: 'Ivan Ivic', username: 'ivke1' },
  { id: 6, externalId: 15179236, name: 'OWNER-ALL', username: 'group_64938374_bot_c6465caf75d2c7093540b94ae4d3f8a8' },
  { id: 7, externalId: 15339276, name: 'Dejan Tot', username: 'dejan-crocoder' },
  { id: 8, externalId: 15514899, name: 'sup', username: 'davidabram' },
];

export function fuzzySearch(gitIdentities: GitIdentities[], members: Member[]): GitIdentitiesToMember[] {
  const options = {
    shouldSort: true,
    threshold: 0.4, // Lower the threshold to make matching more lenient
    location: 0,
    distance: 100,
    maxPatternLength: 32,
    minMatchCharLength: 1,
    keys: ['name'], // Use 'name' as the key for matching
  };

  const result = gitIdentities.map((identity) => {
    const fuse = new Fuse(members, options);
    const result = fuse.search(identity.name);
    if (result.length > 0) {
      if (result[0]) {
        return result[0]; // Access the matched object using the 'item' property
      }
      return null;
    } else {
      return null;
    }
  })

  const filteredResult = result.filter((res) => res !== null);
  
  const mappedIds: GitIdentitiesToMember[] = filteredResult.map((res, index) => {
    return { memberId: res?.item.id, gitIdentityId: gitIdentities[index]?.id};
  });

  console.log("FA", mappedIds);
  return mappedIds;
}

const finale = fuzzySearch(gitIdentities, members);
console.log(finale);
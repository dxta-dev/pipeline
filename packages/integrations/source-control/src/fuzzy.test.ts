import { describe, expect, test } from '@jest/globals';
import { fuzzySearch } from './fuzzy'

const gitIdentities = [
  { id: 1, repositoryId: 1, name: 'Ante Koceić', email: 'ante@crocoder.dev', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 2, repositoryId: 1, name: 'Ante Koceic', email: 'ante@crocodre.dev', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 3, repositoryId: 1, name: 'David Abram', email: 'david@crocoder.dev',_createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 4, repositoryId: 1, name: 'dejan-crocoder', email: 'dejan@crocoder.dev', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 5, repositoryId: 1, name: 'renovate[bot]', email: '29139614+renovate[bot]@users.noreply.github.com', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 6, repositoryId: 1, name: 'dejan-crocoder', email: '139872861+dejan-crocoder@users.noreply.github.com',_createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 7, repositoryId: 1, name: 'Ante-Koceic', email: '97022082+Ante-Koceic@users.noreply.github.com',_createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 8, repositoryId: 1, name: 'Dejan Tot', email: '139872861+dejan-crocoder@users.noreply.github.com',_createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 9, repositoryId: 1, name: 'ivke995', email: 'ivanivic842@gmail.com',_createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 10, repositoryId: 1, name: 'Ivan Ivic', email: '103996436+ivke995@users.noreply.github.com',_createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 11, repositoryId: 1, name: 'GitHub', email: 'noreply@github.com',_createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
];  

const members = [
  { id: 1, externalId: 10978413, name: 'David Abram', username: 'davidabram', _createdAt: new Date('2023-08-30 10:10:26'), _updatedAt: new Date('2023-08-30 10:10:26')},
  { id: 2, externalId: 12518222, name: 'Ante Koceić', username: 'ante10', _createdAt: new Date('2023-08-30 10:10:26'), _updatedAt: new Date('2023-08-30 10:10:26')},
  { id: 3, externalId: 14663566, name: 'ci-cd-test-token', username: 'project_44247924_bot_8a64bd1c92489f26164da69310605f2d', _createdAt: new Date('2023-08-30 10:10:26'), _updatedAt: new Date('2023-08-30 10:10:26')},
  { id: 4, externalId: 15085492, name: 'ivan', username: 'project_44247924_bot_5c797a08301e64e51dbc72fa8d29653f', _createdAt: new Date('2023-08-30 10:10:26'), _updatedAt: new Date('2023-08-30 10:10:26')},
  { id: 5, externalId: 15096039, name: 'Ivan Ivic', username: 'ivke1', _createdAt: new Date('2023-08-30 10:10:26'), _updatedAt: new Date('2023-08-30 10:10:26')},
  { id: 6, externalId: 15179236, name: 'OWNER-ALL', username: 'group_64938374_bot_c6465caf75d2c7093540b94ae4d3f8a8', _createdAt: new Date('2023-08-30 10:10:26'), _updatedAt: new Date('2023-08-30 10:10:26')},
  { id: 7, externalId: 15339276, name: 'Dejan Tot', username: 'dejan-crocoder', _createdAt: new Date('2023-08-30 10:10:26'), _updatedAt: new Date('2023-08-30 10:10:26')},
  { id: 8, externalId: 15514899, name: 'sup', username: 'group_64938374_bot_08dc84e9abe071352e8845b2cb3ce70a', _createdAt: new Date('2023-08-30 10:10:26'), _updatedAt: new Date('2023-08-30 10:10:26')},
  { id: 9, externalId: 6842718, name: 'danicapivalicaabram', username: 'danicapivalicaabram', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14')},
  { id: 10, externalId: 7620347, name: 'davidabram', username: 'davidabram', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 11, externalId: 17670202, name: 'IvanPenga', username: 'IvanPenga', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14')},
  { id: 12, externalId: 68769671, name: 'stefanskoricdev', username: 'stefanskoricdev', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 13, externalId: 71839055, name: 'crocoder-bot', username: 'crocoder-bot', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 14, externalId: 79873689, name: 'sesar002', username: 'sesar002', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 15, externalId: 95020322, name: 'vele616', username: 'vele616', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 16, externalId: 97022082, name: 'Ante-Koceic', username: 'Ante-Koceic', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 17, externalId: 100783701, name: 'marijaduvnjak', username: 'marijaduvnjak', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 18, externalId: 103996436, name: 'ivke995', username: 'ivke995', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 19, externalId: 122017510, name: 'gloriababic', username: 'gloriababic', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 20, externalId: 139872861, name: 'dejan-crocoder', username: 'dejan-crocoder', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14')},
];

const mappedMembersToGitIdentities = [
  { memberId: 1, gitIdentityId: 3 },
  { memberId: 2, gitIdentityId: 1 },
  { memberId: 2, gitIdentityId: 2 },
  { memberId: 2, gitIdentityId: 7 },
  { memberId: 4, gitIdentityId: 9 },
  { memberId: 4, gitIdentityId: 10 },
  { memberId: 5, gitIdentityId: 9 },
  { memberId: 5, gitIdentityId: 10 },
  { memberId: 7, gitIdentityId: 4 },
  { memberId: 7, gitIdentityId: 6 },
  { memberId: 7, gitIdentityId: 8 },
  { memberId: 10, gitIdentityId: 3 },
  { memberId: 16, gitIdentityId: 7 },
  { memberId: 16, gitIdentityId: 2 },
  { memberId: 16, gitIdentityId: 1 },
  { memberId: 18, gitIdentityId: 9 },
  { memberId: 18, gitIdentityId: 10 },
  { memberId: 20, gitIdentityId: 6 },
  { memberId: 20, gitIdentityId: 4 },
  { memberId: 20, gitIdentityId: 8 }
]

describe('fuzzy:', () => {
  describe('fuzzy', () => {
    test('should map members to git identities', () => {
      const result = fuzzySearch(gitIdentities, members);
      expect(result).toEqual(mappedMembersToGitIdentities);
    });
  });
});
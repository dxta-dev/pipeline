import { describe, expect, test } from '@jest/globals';
import { fuzzySearch } from './fuzzy'

const gitIdentities = [
  { id: 1, repositoryId: 1, name: 'Ante Koceić', email: 'ante@crocoder.dev', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
  { id: 2, repositoryId: 1, name: 'Ante Koceic', email: 'ante@crocodre.dev', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
  { id: 3, repositoryId: 1, name: 'David Abram', email: 'david@crocoder.dev',_createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
  { id: 4, repositoryId: 1, name: 'dejan-crocoder', email: 'dejan@crocoder.dev', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
  { id: 5, repositoryId: 1, name: 'renovate[bot]', email: '29139614+renovate[bot]@users.noreply.github.com', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
  { id: 6, repositoryId: 1, name: 'dejan-crocoder', email: '139872861+dejan-crocoder@users.noreply.github.com',_createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
  { id: 7, repositoryId: 1, name: 'Ante-Koceic', email: '97022082+Ante-Koceic@users.noreply.github.com',_createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
  { id: 8, repositoryId: 1, name: 'Dejan Tot', email: '139872861+dejan-crocoder@users.noreply.github.com',_createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
  { id: 9, repositoryId: 1, name: 'ivke995', email: 'ivanivic842@gmail.com',_createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
  { id: 10, repositoryId: 1, name: 'Ivan Ivic', email: '103996436+ivke995@users.noreply.github.com',_createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
  { id: 11, repositoryId: 1, name: 'GitHub', email: 'noreply@github.com',_createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
];  
  
const members = [
  { id: 1, externalId: 6842718, name: 'danicapivalicaabram', username: 'danicapivalicaabram', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02')},
  { id: 2, externalId: 7620347, name: 'davidabram', username: 'davidabram', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
  { id: 3, externalId: 17670202, name: 'IvanPenga', username: 'IvanPenga', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02')},
  { id: 4, externalId: 68769671, name: 'stefanskoricdev', username: 'stefanskoricdev', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
  { id: 5, externalId: 71839055, name: 'crocoder-bot', username: 'crocoder-bot', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
  { id: 6, externalId: 79873689, name: 'sesar002', username: 'sesar002', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
  { id: 7, externalId: 95020322, name: 'vele616', username: 'vele616', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
  { id: 8, externalId: 97022082, name: 'Ante-Koceic', username: 'Ante-Koceic', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
  { id: 9, externalId: 100783701, name: 'marijaduvnjak', username: 'marijaduvnjak', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
  { id: 10, externalId: 103996436, name: 'ivke995', username: 'ivke995', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
  { id: 11, externalId: 122017510, name: 'gloriababic', username: 'gloriababic', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02') },
  { id: 12, externalId: 139872861, name: 'dejan-crocoder', username: 'dejan-crocoder', _createdAt: new Date('2023-08-30 08:09:02'), _updatedAt: new Date('2023-08-30 08:09:02')},
];

const mappedMembersToGitIdentities = [
  { memberId: 2, gitIdentityId: 3 },
  { memberId: 8, gitIdentityId: 7 },
  { memberId: 8, gitIdentityId: 2 },
  { memberId: 8, gitIdentityId: 1 },
  { memberId: 10, gitIdentityId: 9 },
  { memberId: 10, gitIdentityId: 10 },
  { memberId: 12, gitIdentityId: 6 },
  { memberId: 12, gitIdentityId: 4 },
  { memberId: 12, gitIdentityId: 8 }
]

describe('fuzzy:', () => {
  describe('fuzzy', () => {
    test('should map members to git identities', () => {
      const result = fuzzySearch(gitIdentities, members);
      expect(result).toEqual(mappedMembersToGitIdentities);
    });
  });
});
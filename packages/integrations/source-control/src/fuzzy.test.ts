import { describe, expect, test } from '@jest/globals';
import { fuzzySearch } from './fuzzy'
import type { GitIdentities, Member } from '@acme/extract-schema';

//GITHUB
const gitIdentitiesGitHub: GitIdentities[] = [
  { id: 1, repositoryId: 1, name: 'renovate[bot', email: '29139614+renovate[bot]@users.noreply.github.com', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 2, repositoryId: 1, name: 'David Abram', email: 'david@crocoder.dev', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 3, repositoryId: 1, name: 'dejan-crocoder', email: 'dejan@crocoder.dev',_createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 4, repositoryId: 1, name: 'Ante Koceić', email: 'ante@crocoder.dev', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 5, repositoryId: 1, name: 'ivke995', email: 'ivanivic842@gmail.com', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 6, repositoryId: 1, name: 'Ivan Ivic', email: '103996436+ivke995@users.noreply.github.com',_createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 7, repositoryId: 1, name: 'dejan-crocoder', email: '139872861+dejan-crocoder@users.noreply.github.com',_createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 8, repositoryId: 1, name: 'Dejan Tot', email: '139872861+dejan-crocoder@users.noreply.github.com',_createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 9, repositoryId: 1, name: 'Ante-Koceic', email: '97022082+Ante-Koceic@users.noreply.github.com',_createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 10, repositoryId: 1, name: 'GitHub', email: 'noreply@github.com',_createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
];

//GITHUB
const membersGitHub: Member[] = [
  { id: 1, externalId: 6842718, name: 'Danica Pivalica Abram', username: 'danicapivalicaabram', email: 'danica@crocoder.dev', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14')},
  { id: 2, externalId: 7620347, name: 'David Abram', username: 'davidabram', email: 'david@crocoder.dev', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 3, externalId: 17670202, name: 'Ivan Penga', username: 'IvanPenga', email: 'ivan.penga2@gmail.com', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14')},
  { id: 4, externalId: 68769671, name: 'Stefan Skoric', username: 'stefanskoricdev', email: null, _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 5, externalId: 71839055, name: 'CroCoder Bot', username: 'crocoder-bot', email: null, _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 6, externalId: 79873689, name: 'Luka', username: 'sesar002', email: null, _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 7, externalId: 95020322, name: 'Velimir Ujević', username: 'vele616', email: null, _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 8, externalId: 97022082, name: null, username: 'Ante-Koceic', email: 'ante@crocoder.dev', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 9, externalId: 100783701, name: 'Marija Duvnjak', username: 'marijaduvnjak', email: null, _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 10, externalId: 103996436, name: 'Ivan Ivic', username: 'ivke995', email: 'ivanivic842@gmail.com', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 11, externalId: 122017510, name: 'Gloria Babić', username: 'gloriababic', email: 'gloria@crocoder.dev', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 12, externalId: 139872861, name: 'Dejan Tot', username: 'dejan-crocoder', email: null, _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14')},
];

//GITLAB
const gitIdentitiesGitLab: GitIdentities[] = [
  { id: 1, repositoryId: 2, name: 'Ante Koceić', email: 'ante@crocoder.dev', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 2, repositoryId: 2, name: 'Ante Koceic', email: 'ante@crocodre.dev', _createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
  { id: 3, repositoryId: 2, name: 'David Abram', email: 'david@crocoder.dev',_createdAt: new Date('2023-08-30 10:17:14'), _updatedAt: new Date('2023-08-30 10:17:14') },
];

//GITLAB
const membersGitLab: Member[] = [
  { id: 1, externalId: 10978413, name: 'David Abram', username: 'davidabram', email: null, _createdAt: new Date('2023-08-30 10:10:26'), _updatedAt: new Date('2023-08-30 10:10:26')},
  { id: 2, externalId: 12518222, name: 'Ante Koceić', username: 'ante10', email: null, _createdAt: new Date('2023-08-30 10:10:26'), _updatedAt: new Date('2023-08-30 10:10:26')},
  { id: 3, externalId: 14663566, name: 'ci-cd-test-token', username: 'project_44247924_bot_8a64bd1c92489f26164da69310605f2d', email: null, _createdAt: new Date('2023-08-30 10:10:26'), _updatedAt: new Date('2023-08-30 10:10:26')},
  { id: 4, externalId: 15085492, name: 'ivan', username: 'project_44247924_bot_5c797a08301e64e51dbc72fa8d29653f', email: null, _createdAt: new Date('2023-08-30 10:10:26'), _updatedAt: new Date('2023-08-30 10:10:26')},
  { id: 5, externalId: 15096039, name: 'Ivan Ivic', username: 'ivke1', email: null, _createdAt: new Date('2023-08-30 10:10:26'), _updatedAt: new Date('2023-08-30 10:10:26')},
  { id: 6, externalId: 15179236, name: 'OWNER-ALL', username: 'group_64938374_bot_c6465caf75d2c7093540b94ae4d3f8a8', email: null, _createdAt: new Date('2023-08-30 10:10:26'), _updatedAt: new Date('2023-08-30 10:10:26')},
  { id: 7, externalId: 15339276, name: 'Dejan Tot', username: 'dejan-crocoder', email: null, _createdAt: new Date('2023-08-30 10:10:26'), _updatedAt: new Date('2023-08-30 10:10:26')},
  { id: 8, externalId: 15514899, name: 'sup', username: 'group_64938374_bot_08dc84e9abe071352e8845b2cb3ce70a', email: null, _createdAt: new Date('2023-08-30 10:10:26'), _updatedAt: new Date('2023-08-30 10:10:26')},
];

const mappedMembersToGitIdentitiesGitHub = [
  { memberId: 2, gitIdentityId: 2 },
  { memberId: 3, gitIdentityId: 5 },
  { memberId: 3, gitIdentityId: 6 },
  { memberId: 5, gitIdentityId: 7 },
  { memberId: 5, gitIdentityId: 1 },
  { memberId: 5, gitIdentityId: 3 },
  { memberId: 5, gitIdentityId: 8 },
  { memberId: 8, gitIdentityId: 9 },
  { memberId: 8, gitIdentityId: 4 },
  { memberId: 10, gitIdentityId: 5 },
  { memberId: 10, gitIdentityId: 6 },
  { memberId: 12, gitIdentityId: 3 },
  { memberId: 12, gitIdentityId: 7 },
  { memberId: 12, gitIdentityId: 8 }
];
const mappedMembersToGitIdentitiesGitLab = [
  { memberId: 1, gitIdentityId: 3 },
  { memberId: 2, gitIdentityId: 1 },
  { memberId: 2, gitIdentityId: 2 }
];

describe('fuzzy:', () => {
  describe('fuzzy', () => {
    test('should map members from GitHub to git identities from GitHab', () => {
      const result = fuzzySearch(gitIdentitiesGitHub, membersGitHub);
      expect(result).toEqual(mappedMembersToGitIdentitiesGitHub);
    });
    /*test('should map members from GitLub to git identities from GitLab', () => {
      const result = fuzzySearch(gitIdentitiesGitLab, membersGitLab);
      expect(result).toEqual(mappedMembersToGitIdentitiesGitLab);
    });*/
  });
});

import { describe, expect, test } from '@jest/globals';
import { fuzzySearch } from './fuzzy'


const membersGitHub = [
  { id: 1, externalId: 6842718, name: 'Danica Pivalica Abram', username: 'danicapivalicaabram', email: 'danica@crocoder.dev'},
  { id: 2, externalId: 7620347, name: 'David Abram', username: 'davidabram', email: 'david@crocoder.dev' },
  { id: 3, externalId: 17670202, name: 'Ivan Penga', username: 'IvanPenga', email: 'ivan.penga2@gmail.com'},
  { id: 4, externalId: 68769671, name: 'Stefan Skoric', username: 'stefanskoricdev', email: null },
  { id: 5, externalId: 71839055, name: 'CroCoder Bot', username: 'crocoder-bot', email: null },
  { id: 6, externalId: 79873689, name: 'Luka', username: 'sesar002', email: null },
  { id: 7, externalId: 95020322, name: 'Velimir Ujević', username: 'vele616', email: null },
  { id: 8, externalId: 97022082, name: null, username: 'Ante-Koceic', email: 'ante@crocoder.dev' },
  { id: 9, externalId: 100783701, name: 'Marija Duvnjak', username: 'marijaduvnjak', email: null },
  { id: 10, externalId: 103996436, name: 'Ivan Ivic', username: 'ivke995', email: 'ivanivic842@gmail.com' },
  { id: 11, externalId: 122017510, name: 'Gloria Babić', username: 'gloriababic', email: 'gloria@crocoder.dev' },
  { id: 12, externalId: 139872861, name: 'Dejan Tot', username: 'dejan-crocoder', email: null},
];

const gitIdentitiesGitHub = [
  { id: 1, repositoryId: 1, name: 'renovate[bot]', email: '29139614+renovate[bot]@users.noreply.github.com' },
  { id: 2, repositoryId: 1, name: 'David Abram', email: 'david@crocoder.dev' },
  { id: 3, repositoryId: 1, name: 'dejan-crocoder', email: 'dejan@crocoder.dev' },
  { id: 4, repositoryId: 1, name: 'Ante Koceić', email: 'ante@crocoder.dev' },
  { id: 5, repositoryId: 1, name: 'ivke995', email: 'ivanivic842@gmail.com' },
  { id: 6, repositoryId: 1, name: 'Ivan Ivic', email: '103996436+ivke995@users.noreply.github.com' },
  { id: 7, repositoryId: 1, name: 'dejan-crocoder', email: '139872861+dejan-crocoder@users.noreply.github.com' },
  { id: 8, repositoryId: 1, name: 'Dejan Tot', email: '139872861+dejan-crocoder@users.noreply.github.com' },
  { id: 9, repositoryId: 1, name: 'Ante-Koceic', email: '97022082+Ante-Koceic@users.noreply.github.com' },
  { id: 10, repositoryId: 1, name: 'GitHub', email: 'noreply@github.com' },
];

const githubMappedMembers = new Map<number, Set<number>>;

githubMappedMembers.set(2, new Set([2]));
githubMappedMembers.set(8, new Set([4, 9]));
githubMappedMembers.set(10, new Set([5, 6]));
githubMappedMembers.set(12, new Set([7, 3, 8]));


const membersGitLab = [
  { id: 1, externalId: 10978413, name: 'David Abram', username: 'davidabram', email: null},
  { id: 2, externalId: 12518222, name: 'Ante Koceić', username: 'ante10', email: null},
  { id: 3, externalId: 14663566, name: 'ci-cd-test-token', username: 'project_44247924_bot_8a64bd1c92489f26164da69310605f2d', email: null},
  { id: 4, externalId: 15085492, name: 'ivan', username: 'project_44247924_bot_5c797a08301e64e51dbc72fa8d29653f', email: null},
  { id: 5, externalId: 15096039, name: 'Ivan Ivic', username: 'ivke1', email: null},
  { id: 6, externalId: 15179236, name: 'OWNER-ALL', username: 'group_64938374_bot_c6465caf75d2c7093540b94ae4d3f8a8', email: null},
  { id: 7, externalId: 15339276, name: 'Dejan Tot', username: 'dejan-crocoder', email: null},
  { id: 8, externalId: 15514899, name: 'sup', username: 'group_64938374_bot_08dc84e9abe071352e8845b2cb3ce70a', email: null},
];

const gitIdentitiesGitLab = [
  { id: 1, repositoryId: 2, name: 'Ante Koceić', email: 'ante@crocoder.dev' },
  { id: 2, repositoryId: 2, name: 'Ante Koceic', email: 'ante@crocodre.dev' },
  { id: 3, repositoryId: 2, name: 'David Abram', email: 'david@crocoder.dev' },
];


const gitlabMappedMembers = new Map<number, Set<number>>;

gitlabMappedMembers.set(1, new Set([3]));
gitlabMappedMembers.set(2, new Set([1, 2]));

describe('fuzzy:', () => {
  describe('fuzzy', () => {
    test('should map members from GitHub to git identities from GitHab', () => {
      const result = fuzzySearch(gitIdentitiesGitHub, membersGitHub);
      expect(result).toEqual(githubMappedMembers);
    });
    test('should map members from GitLab to git identities from GitLab', () => {
      const result = fuzzySearch(gitIdentitiesGitLab, membersGitLab);
      expect(result).toEqual(gitlabMappedMembers);
    });
  });
});

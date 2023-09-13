import { describe, expect, test } from '@jest/globals';
import { filterBots } from "./filter-bots";

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

const filteredGitIdentitiesGitHub = [
  { id: 2, repositoryId: 1, name: 'David Abram', email: 'david@crocoder.dev' },
  { id: 3, repositoryId: 1, name: 'dejan-crocoder', email: 'dejan@crocoder.dev' },
  { id: 4, repositoryId: 1, name: 'Ante Koceić', email: 'ante@crocoder.dev' },
  { id: 5, repositoryId: 1, name: 'ivke995', email: 'ivanivic842@gmail.com' },
  { id: 6, repositoryId: 1, name: 'Ivan Ivic', email: '103996436+ivke995@users.noreply.github.com' },
  { id: 7, repositoryId: 1, name: 'dejan-crocoder', email: '139872861+dejan-crocoder@users.noreply.github.com' },
  { id: 8, repositoryId: 1, name: 'Dejan Tot', email: '139872861+dejan-crocoder@users.noreply.github.com' },
  { id: 9, repositoryId: 1, name: 'Ante-Koceic', email: '97022082+Ante-Koceic@users.noreply.github.com' },
];

//Gitlab creates a lot of accounts with username project_<some id>_bot and mail address project<some id>_bot@example.com.
const gitIdentitiesGitLab = [
  { id: 1, repositoryId: 2, name: 'Ante Koceić', email: 'ante@crocoder.dev' },
  { id: 2, repositoryId: 2, name: 'ci-cd-test-token', email: 'project_44247924_bot@example.com' },
  { id: 3, repositoryId: 2, name: 'Ante Koceic', email: 'ante@crocodre.dev' },
  { id: 4, repositoryId: 2, name: 'sup', email: 'group_64938374_bot@example.com'},
  { id: 5, repositoryId: 2, name: 'David Abram', email: 'david@crocoder.dev' },
];

const filteredGitIdentitiesGitLab = [
  { id: 1, repositoryId: 2, name: 'Ante Koceić', email: 'ante@crocoder.dev' },
  { id: 3, repositoryId: 2, name: 'Ante Koceic', email: 'ante@crocodre.dev' },
  { id: 5, repositoryId: 2, name: 'David Abram', email: 'david@crocoder.dev' },
];

describe('filter-bots:', () => {
  describe('filter-bots', () => {
    test('should return an array of GitHub identities without bot accounts', () => {
      const result = filterBots(gitIdentitiesGitHub);
      console.log('RES', result);
      expect(result).toEqual(filteredGitIdentitiesGitHub);
    });
    test('should return an array of GitLab identities without bot accounts', () => {
      const result = filterBots(gitIdentitiesGitLab);
      expect(result).toEqual(filteredGitIdentitiesGitLab);
    });
  });
});
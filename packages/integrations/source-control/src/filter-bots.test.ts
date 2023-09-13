import { describe, expect, test } from '@jest/globals';
import { filterBots } from "./filter-bots";

const gitIdentitiesGitHub = [
  { id: 1, repositoryId: 1, name: 'renovate[bot]', email: '29139614+renovate[bot]@users.noreply.github.com', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
  { id: 2, repositoryId: 1, name: 'David Abram', email: 'david@crocoder.dev', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
  { id: 3, repositoryId: 1, name: 'dejan-crocoder', email: 'dejan@crocoder.dev', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
  { id: 4, repositoryId: 1, name: 'Ante Koceić', email: 'ante@crocoder.dev', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
  { id: 5, repositoryId: 1, name: 'ivke995', email: 'ivanivic842@gmail.com', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
  { id: 6, repositoryId: 1, name: 'Ivan Ivic', email: '103996436+ivke995@users.noreply.github.com', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
  { id: 7, repositoryId: 1, name: 'dejan-crocoder', email: '139872861+dejan-crocoder@users.noreply.github.com', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
  { id: 8, repositoryId: 1, name: 'Dejan Tot', email: '139872861+dejan-crocoder@users.noreply.github.com', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
  { id: 9, repositoryId: 1, name: 'Ante-Koceic', email: '97022082+Ante-Koceic@users.noreply.github.com', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
  { id: 10, repositoryId: 1, name: 'GitHub', email: 'noreply@github.com', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
];

const filteredGitIdentitiesGitHub = [
  { id: 2, repositoryId: 1, name: 'David Abram', email: 'david@crocoder.dev', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
  { id: 3, repositoryId: 1, name: 'dejan-crocoder', email: 'dejan@crocoder.dev', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
  { id: 4, repositoryId: 1, name: 'Ante Koceić', email: 'ante@crocoder.dev', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
  { id: 5, repositoryId: 1, name: 'ivke995', email: 'ivanivic842@gmail.com', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
  { id: 6, repositoryId: 1, name: 'Ivan Ivic', email: '103996436+ivke995@users.noreply.github.com', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
  { id: 7, repositoryId: 1, name: 'dejan-crocoder', email: '139872861+dejan-crocoder@users.noreply.github.com', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
  { id: 8, repositoryId: 1, name: 'Dejan Tot', email: '139872861+dejan-crocoder@users.noreply.github.com', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
  { id: 9, repositoryId: 1, name: 'Ante-Koceic', email: '97022082+Ante-Koceic@users.noreply.github.com', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
];

//Gitlab creates a lot of accounts with username project_<some id>_bot and mail address project<some id>_bot@example.com.
const gitIdentitiesGitLab = [
  { id: 1, repositoryId: 2, name: 'Ante Koceić', email: 'ante@crocoder.dev', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
  { id: 2, repositoryId: 2, name: 'ci-cd-test-token', email: 'project_44247924_bot@example.com', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
  { id: 3, repositoryId: 2, name: 'Ante Koceic', email: 'ante@crocodre.dev', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
  { id: 4, repositoryId: 2, name: 'sup', email: 'group_64938374_bot@example.com', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
  { id: 5, repositoryId: 2, name: 'David Abram', email: 'david@crocoder.dev', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
];

const filteredGitIdentitiesGitLab = [
  { id: 1, repositoryId: 2, name: 'Ante Koceić', email: 'ante@crocoder.dev', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
  { id: 3, repositoryId: 2, name: 'Ante Koceic', email: 'ante@crocodre.dev', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
  { id: 5, repositoryId: 2, name: 'David Abram', email: 'david@crocoder.dev', _createdAt: new Date('2023-09-12'), _updatedAt: new Date('2023-09-12') },
];

describe('filter-bots:', () => {
  describe('filter-bots', () => {
    test('should return an array of GitHub identities without bot accounts', () => {
      const result = filterBots(gitIdentitiesGitHub);
      expect(result).toEqual(filteredGitIdentitiesGitHub);
    });
    test('should return an array of GitLab identities without bot accounts', () => {
      const result = filterBots(gitIdentitiesGitLab);
      expect(result).toEqual(filteredGitIdentitiesGitLab);
    });
  });
});
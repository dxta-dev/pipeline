import { describe, expect, test } from '@jest/globals';
import { knownBots } from "./known-bots";

const gitIdentitiesGitHub = [
  { id: 1, name: 'renovate[bot]', email: '29139614+renovate[bot]@users.noreply.github.com' },
  { id: 2, name: 'David Abram', email: 'david@crocoder.dev' },
  { id: 3, name: 'dejan-crocoder', email: 'dejan@crocoder.dev' },
  { id: 4, name: 'Ante Koceić', email: 'ante@crocoder.dev' },
  { id: 5, name: 'ivke995', email: 'ivanivic842@gmail.com' },
  { id: 6, name: 'Ivan Ivic', email: '103996436+ivke995@users.noreply.github.com' },
  { id: 7, name: 'dejan-crocoder', email: '139872861+dejan-crocoder@users.noreply.github.com' },
  { id: 8, name: 'Dejan Tot', email: '139872861+dejan-crocoder@users.noreply.github.com' },
  { id: 9, name: 'Ante-Koceic', email: '97022082+Ante-Koceic@users.noreply.github.com' },
  { id: 10, name: 'GitHub', email: 'noreply@github.com' },
  { id: 11, name: 'CroCoder Bot', email: 'crocoder.dev@gmail.com' }
];

const filteredGitIdentitiesGitHub = [
  { id: 2, name: 'David Abram', email: 'david@crocoder.dev' },
  { id: 3, name: 'dejan-crocoder', email: 'dejan@crocoder.dev' },
  { id: 4, name: 'Ante Koceić', email: 'ante@crocoder.dev' },
  { id: 5, name: 'ivke995', email: 'ivanivic842@gmail.com' },
  { id: 6, name: 'Ivan Ivic', email: '103996436+ivke995@users.noreply.github.com' },
  { id: 7, name: 'dejan-crocoder', email: '139872861+dejan-crocoder@users.noreply.github.com' },
  { id: 8, name: 'Dejan Tot', email: '139872861+dejan-crocoder@users.noreply.github.com' },
  { id: 9, name: 'Ante-Koceic', email: '97022082+Ante-Koceic@users.noreply.github.com' },
];

const gitIdentitiesGitLab = [
  { id: 1, name: 'Ante Koceić', email: 'ante@crocoder.dev' },
  { id: 2, name: 'ci-cd-test-token', email: 'project_44247924_bot_8a64bd1c92489f26164da69310605f2d@noreply.gitlab.com' },
  { id: 3, name: 'Ante Koceic', email: 'ante@crocodre.dev' },
  { id: 4, name: 'sup', email: 'group_64938374_bot_08dc84e9abe071352e8845b2cb3ce70a@noreply.gitlab.com' },
  { id: 5, name: 'David Abram', email: 'david@crocoder.dev' },
  { id: 6, name: 'Ante Cash', email: 'project_44247924_bot_46e091bcc88e8e5636c00d5119fe8e47@noreply.gitlab.com' },
];

const filteredGitIdentitiesGitLab = [
  { id: 1, name: 'Ante Koceić', email: 'ante@crocoder.dev' },
  { id: 3, name: 'Ante Koceic', email: 'ante@crocodre.dev' },
  { id: 5, name: 'David Abram', email: 'david@crocoder.dev' },
];

describe('filter-bots:', () => {
  describe('filter-bots', () => {
    test('should return an array of GitHub identities without bot accounts', () => {
      const result = knownBots(gitIdentitiesGitHub);
      expect(result).toEqual(filteredGitIdentitiesGitHub);
    });
    test('should return an array of GitLab identities without bot accounts', () => {
      const result = knownBots(gitIdentitiesGitLab);
      expect(result).toEqual(filteredGitIdentitiesGitLab);
    });
  });
});
import { describe, expect, test } from '@jest/globals';
import { isGitIdentityKnownBot, isMemberKnownBot } from "./known-bots";

const gitIdentitiesGitHub = [
  { name: 'renovate[bot]', email: '29139614+renovate[bot]@users.noreply.github.com' },
  { name: 'David Abram', email: 'david@crocoder.dev' },
  { name: 'dejan-crocoder', email: 'dejan@crocoder.dev' },
  { name: 'Ante Koceić', email: 'ante@crocoder.dev' },
  { name: 'Ivan Ivic', email: '103996436+ivke995@users.noreply.github.com' },
  { name: 'dejan-crocoder', email: '139872861+dejan-crocoder@users.noreply.github.com' },
  { name: 'Dejan Tot', email: '139872861+dejan-crocoder@users.noreply.github.com' },
  { name: 'Ante-Koceic', email: '97022082+Ante-Koceic@users.noreply.github.com' },
  { name: 'GitHub', email: 'noreply@github.com' },
  { name: 'CroCoder Bot', email: 'crocoder.dev@gmail.com' }
];

const filteredGitIdentitiesGitHub = [
  { name: 'David Abram', email: 'david@crocoder.dev' },
  { name: 'dejan-crocoder', email: 'dejan@crocoder.dev' },
  { name: 'Ante Koceić', email: 'ante@crocoder.dev' },
  { name: 'Ivan Ivic', email: '103996436+ivke995@users.noreply.github.com' },
  { name: 'dejan-crocoder', email: '139872861+dejan-crocoder@users.noreply.github.com' },
  { name: 'Dejan Tot', email: '139872861+dejan-crocoder@users.noreply.github.com' },
  { name: 'Ante-Koceic', email: '97022082+Ante-Koceic@users.noreply.github.com' },
];

const gitIdentitiesGitlab = [
  { name: 'Ante Koceić', email: 'ante@crocoder.dev' },
  { name: 'ci-cd-test-token', email: 'project_44247924_bot_8a64bd1c92489f26164da69310605f2d@noreply.gitlab.com' },
  { name: 'Ante Koceic', email: 'ante@crocodre.dev' },
  { name: 'sup', email: 'group_64938374_bot_08dc84e9abe071352e8845b2cb3ce70a@noreply.gitlab.com' },
  { name: 'David Abram', email: 'david@crocoder.dev' },
  { name: 'Ante Cash', email: 'project_44247924_bot_46e091bcc88e8e5636c00d5119fe8e47@noreply.gitlab.com' },
];

const filteredGitIdentitiesGitlab = [
  { name: 'Ante Koceić', email: 'ante@crocoder.dev' },
  { name: 'Ante Koceic', email: 'ante@crocodre.dev' },
  { name: 'David Abram', email: 'david@crocoder.dev' },
];

const membersGitHub = [
  { externalId: 11111111, username: "davidabram", },
  { externalId: 22222222, username: "dejan-crocoder" },
  { externalId: 29139614, username: "renovate[bot]" },
  { externalId: 33333333, username: "Ante-Koceic" },
  { externalId: 44444444, username: "ivke995" },
];

const filteredMembersGitHub = [
  { externalId: 11111111, username: "davidabram", },
  { externalId: 22222222, username: "dejan-crocoder" },
  { externalId: 33333333, username: "Ante-Koceic" },
  { externalId: 44444444, username: "ivke995" },
]

const membersGitlab = [
  { externalId: 14663566, username: "project_44247924_bot_8a64bd1c92489f26164da69310605f2d" },
  { externalId: 11111111, username: "ante10" },
  { externalId: 22222222, username: "davidabram" },
];

const filteredMembersGitlab = [
  { externalId: 11111111, username: "ante10" },
  { externalId: 22222222, username: "davidabram" },
]

describe('filter-bots:', () => {
  describe('gitIdentities', ()=> {
    test('should filter out bot accounts from an array of GitHub identities', ()=> {
      const result = gitIdentitiesGitHub.filter(identity => isGitIdentityKnownBot('github', identity));
      expect(result).toEqual(filteredGitIdentitiesGitHub);
    });
    test('should filter out bot accounts from an array of Gitlab identities', ()=> {
      const result = gitIdentitiesGitlab.filter(identity => isGitIdentityKnownBot('github', identity));
      expect(result).toEqual(filteredGitIdentitiesGitlab);
    });
  });
  describe('members', ()=> {
    test('should filter out bot accounts from an array of GitHub members', ()=> {
      const result = membersGitHub.filter(member => isMemberKnownBot('github', member));
      expect(result).toEqual(filteredMembersGitHub);
    });
    test('should filter out bot accounts from an array of Gitlab members', ()=> {
      const result = membersGitlab.filter(member => isMemberKnownBot('gitlab', member));
      expect(result).toEqual(filteredMembersGitlab);
    });
  });
});
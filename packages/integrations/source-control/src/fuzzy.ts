import Fuse from "fuse.js";

const gitIdentities = [
  { name: 'GitHub', email: 'noreply@github.com' },
  { name: 'dejan-crocoder', email: 'dejan@crocoder.dev' },
  { name: 'David Abram', email: 'david@crocoder.dev' },
  { name: 'Dejan Tot', email: '139872861+dejan-crocoder@users.noreply.github.com' },
  { name: 'Ante Koceić', email: 'ante@crocoder.dev' },
  { name: 'ivke995', email: 'ivanivic842@gmail.com' },
];

// JUST FOR TESTING
const members = [
  { name: 'danicapivalicaabram', username: 'danicapivalicaabram' },
  { name: 'davidabram', username: 'davidabram' },
  { name: 'IvanPenga', username: 'IvanPenga' },
  { name: 'stefanskoricdev', username: 'stefanskoricdev' },
  { name: 'crocoder-bot', username: 'crocoder-bot' },
  { name: 'sesar002', username: 'sesar002' },
  { name: 'vele616', username: 'vele616' },
  { name: 'Ante-Koceic', username: 'Ante-Koceic' },
  { name: 'marijaduvnjak', username: 'marijaduvnjak' },
  { name: 'ivke995', username: 'ivke995' },
  { name: 'gloriababic', username: 'gloriababic' },
  { name: 'dejan-crocoder', username: 'dejan-crocoder' },
];

const extractUserFromEmail = (email: string) => {
  const [name] = email.split('@');
  return name;
};

const identities = gitIdentities.map((identity) => {
  const name = extractUserFromEmail(identity.email);
  return { name: identity.name, username: name };
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

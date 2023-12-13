// ToDo look into more potential bots
/*
Renovate bot
name: renovate[bot]
email: ^29139614+renovate\[bot]@users\.noreply\.github\.com$
GitLab bot
name: can_be_anything
email: [project|group]\_[0-9]{1,}\_bot\_[a-zA-Z0-9]{1,}@noreply.gitlab.com
*/
type GitIdentity = { name: string; email: string; };

const listOfKnownBotGitIdentitiesGitHub = [
  {
    name: "renovate[bot]",
    email: "29139614+renovate[bot]@users.noreply.github.com",
  },
  {
    name: "CroCoder Bot",
    email: "crocoder.dev@gmail.com",
  }
] satisfies GitIdentity[];

const listOfKnownBotGitIdentitiesGitlab = [] satisfies GitIdentity[];

const isGitIdentityGitlabServiceAccount = ({ email }: GitIdentity) => /^(project|group)\_[0-9]{1,}\_bot\_[a-zA-Z0-9]{1,}@noreply\.gitlab\.com$/.test(email);

export function isGitIdentityKnownBot(forgeType: 'github' | 'gitlab', gitIdentity: { name: string, email: string }) {
  const listOfKnownBotGitIdentities = forgeType === 'github' ? listOfKnownBotGitIdentitiesGitHub : listOfKnownBotGitIdentitiesGitlab;
  if (listOfKnownBotGitIdentities.find(bot => bot.email === gitIdentity.email)) return true;

  if (forgeType === 'gitlab' && isGitIdentityGitlabServiceAccount(gitIdentity)) return true;

  return false;
}
type Member = { externalId: number, username: string };
const listOfKnownBotMembersGitHub = [
  {
    externalId: 29139614,
    username: "renovate[bot]",
  },
  {
    externalId: 71839055,
    username: "crocoder-bot",
  }
] satisfies Member[];
const listOfKnownBotMembersGitlab = [] satisfies Member[];

const isMemberGitlabServiceAccount = ({ username }: Member) => /^(project|group)\_[0-9]{1,}\_bot\_[a-zA-Z0-9]{1,}$/.test(username);

export function isMemberKnownBot(forgeType: 'github' | 'gitlab', member: Member) {
  const listOfKnownBotMembers = forgeType === 'github' ? listOfKnownBotMembersGitHub : listOfKnownBotMembersGitlab;
  if (listOfKnownBotMembers.find(bot => bot.externalId === member.externalId)) return true;

  if (forgeType === 'gitlab' && isMemberGitlabServiceAccount(member)) return true;

  return false;
}

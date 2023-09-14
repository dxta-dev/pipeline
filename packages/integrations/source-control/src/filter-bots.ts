import type { GitIdentities } from "@acme/extract-schema";

interface BotInfo {
  name?: string,
  email: RegExp | string,
}

// ToDo look into more potential bots
/*
Renovate bot
name: renovate[bot]
email: ^[0-9]{1,}\+renovate\[bot]@users\.noreply\.github\.com$
GitHub bot
name: GitHub
email: noreply@github.com
GitLab bot
name: can_be_anything
email: [project|group]\_[0-9]{1,}\_bot\_[a-zA-Z0-9]{1,}@noreply.gitlab.com
*/
const knownBots: BotInfo[] = [
  {
    name: 'renovate[bot]',
    email: new RegExp(/^[0-9]{1,}\+renovate\[bot\]@users\.noreply\.github\.com$/),
  },
  {
    name: 'GitHub',
    email: 'noreply@github.com',
  },
  {
    email: new RegExp(/^(project|group)\_[0-9]{1,}\_bot\_[a-zA-Z0-9]{1,}@noreply.gitlab.com$/),
  }
];

const checkForBotKeywords = (name: string, email: string , knownBots: BotInfo[]) => {
  return knownBots.some((knownBot) => {
    let nameCheck = false;
    let emailCheck = false;
    if (knownBot.name) {
      nameCheck = name.includes(knownBot.name);
    }
    if (typeof(knownBot.email) === 'string') {
      emailCheck = email.includes(knownBot.email);
    } else {
      emailCheck = knownBot.email.test(email);
    }
    return nameCheck || emailCheck;
  });
}

export function filterBots(gitIdentities: GitIdentities[]) {
  const gitIdentitiesWithoutBots = gitIdentities.filter(
    (identity) => !checkForBotKeywords(identity.name, identity.email, knownBots)
  );
  return gitIdentitiesWithoutBots;
}

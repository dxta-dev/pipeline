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

type BotInfo = {
  type: 'string-regex',
  name: string,
  email: RegExp,
} | {
  type: 'string-string',
  name: string,
  email: string,
} | {
  type: 'regex',
  email: RegExp,
}

const listOfKnownBots: BotInfo[] = [
  {
    type: 'string-regex',
    name: 'renovate[bot]',
    email: new RegExp(/^[0-9]{1,}\+renovate\[bot\]@users\.noreply\.github\.com$/),
  },
  {
    type: 'string-string',
    name: 'GitHub',
    email: 'noreply@github.com',
  },
  {
    type: 'regex',
    email: new RegExp(/^(project|group)\_[0-9]{1,}\_bot\_[a-zA-Z0-9]{1,}@noreply.gitlab.com$/),
  },
  {
    type: 'string-string',
    name: 'CroCoder Bot',
    email: 'crocoder.dev@gmail.com',
  }
];

const checkForBotKeywords = (name: string, email: string, listOfKnownBots: BotInfo[]) => {
  return listOfKnownBots.some((knownBot) => {
    switch (knownBot.type) {
      case 'string-regex':
        if (name === knownBot.name)
          if(knownBot.email.test(email))
            return true;
        return false;
      case 'string-string':
        if (name === knownBot.name)
          if (email === knownBot.email)
            return true;
        return false;
      case 'regex':
        if (knownBot.email.test(email))
          return true;
        return false;
      default:
        return false;
    }
  });
}

export function filterKnownBots(gitIdentities: { name: string, email: string , id: number}[]) {
  const gitIdentitiesWithoutBots = gitIdentities.filter(
    (identity) => !checkForBotKeywords(identity.name, identity.email, listOfKnownBots)
  );
  return gitIdentitiesWithoutBots;
}

import type { GitIdentities } from "@acme/extract-schema";

// ToDo look into more potential bots
// in name => bot / GitHub
// in email => bot
const botNameKeywords = ['bot', 'GitHub'];
const botEmailKeywords = ['bot'];

const checkForBotKeywords = (identity: string, botKeywords: string[]) => {
  return botKeywords.some((keyword) => identity.includes(keyword));
}

export function filterBots(gitIdentities: GitIdentities[]) {
  const gitIdentitiesWithoutBots = gitIdentities.filter(
    (identity) => !checkForBotKeywords(identity.name, botNameKeywords) && !checkForBotKeywords(identity.email, botEmailKeywords)
  );
  return gitIdentitiesWithoutBots;
}
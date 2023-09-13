import type { GitIdentities } from "@acme/extract-schema";

// ToDo look into more potential bots
// GitHub bots => in name: bot / GitHub
// GitLab bots => in email: bot
const botName = ['bot', 'GitHub'];
const botEmail = ['bot'];

const checkForValue = (identity: string, valuesToCheck: string[]) => {
  const test = valuesToCheck.filter((singleString) => identity.includes(singleString));
  return test.length === 0;
}

export function filterBots(gitIdentities: GitIdentities[]) {
  const gitIdentitiesWithoutBots = gitIdentities.filter(
    (identity) => checkForValue(identity.name, botName) && checkForValue(identity.email, botEmail)
  );
  return gitIdentitiesWithoutBots;
}
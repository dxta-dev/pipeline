import type { GitIdentities } from "@acme/extract-schema";

// ToDo look into more potential bots
// GitHub bots => in name: bot / GitHub
// GitLab bots => in email: bot
export function filterBots(gitIdentities: Pick<GitIdentities, 'id' | 'name' | 'email'>[]) {
  const gitIdentitiesWithoutBots = gitIdentities.filter(
    (identity) => !identity.name.includes('bot') && !identity.name.includes('GitHub') && !identity.email.includes('bot')
  );
  return gitIdentitiesWithoutBots;
}
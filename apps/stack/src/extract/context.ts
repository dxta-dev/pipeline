import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { Config } from "sst/node/config";
import { getClerkUserToken } from "./get-clerk-user-token";
import { GitHubSourceControl, GitlabSourceControl } from "@dxta/source-control";
import type { SourceControl } from "@dxta/source-control";
import type { Context } from "@dxta/extract-functions";

type initDatabaseInput = { dbUrl: string };
export const initDatabase = ({ dbUrl }: initDatabaseInput) => drizzle(createClient({
  url: dbUrl,
  authToken: Config.TENANT_DATABASE_AUTH_TOKEN,
}));

const initSourceControl = async (userId: string, sourceControl: 'github' | 'gitlab', fetchTimelineEventsPerPage?: number) => {
  const accessToken = await getClerkUserToken(userId, `oauth_${sourceControl}`);
  if (sourceControl === 'github') return new GitHubSourceControl({ auth: accessToken, fetchTimelineEventsPerPage });
  if (sourceControl === 'gitlab') return new GitlabSourceControl(accessToken);
  return null;
}

type NoEntities = Record<string, never>;
type ExtractIntegrations = Context<SourceControl, NoEntities>['integrations'];

type initIntegrationsInput = {
  userId: string;
  sourceControl: 'github' | 'gitlab';
  sourceControlOptions?: {
    fetchTimelineEventsPerPage?: number
  }
};
export const initIntegrations = async ({ userId, sourceControl }: initIntegrationsInput) => {
  return {
    sourceControl: await initSourceControl(userId, sourceControl)
  } satisfies ExtractIntegrations;
}
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { Config } from "sst/node/config";
import { getClerkUserToken } from "./get-clerk-user-token";
import {
  GitHubSourceControl,
  GitlabSourceControl,
  githubErrorMod,
} from "@dxta/source-control";

type initDatabaseInput = { dbUrl: string };
export const initDatabase = ({ dbUrl }: initDatabaseInput) =>
  drizzle(
    createClient({
      url: dbUrl,
      authToken: Config.TENANT_DATABASE_AUTH_TOKEN,
    }),
  );

type initSourceControlInput = {
  userId: string;
  sourceControl: "github" | "gitlab";
  options?: {
    fetchTimelineEventsPerPage?: number;
  };
};
export const initSourceControl = async ({
  userId,
  sourceControl,
  options,
}: initSourceControlInput) => {
  const accessToken = await getClerkUserToken(userId, `oauth_${sourceControl}`);

  if (sourceControl === "github") {
    const githubClient = new GitHubSourceControl({
      auth: accessToken,
      fetchTimelineEventsPerPage: options?.fetchTimelineEventsPerPage,
    });
    return githubErrorMod(githubClient);
  }

  if (sourceControl === "gitlab") {
    return new GitlabSourceControl(accessToken);
  }

  return null;
};

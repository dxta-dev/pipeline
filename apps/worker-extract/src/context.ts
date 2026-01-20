import { createClient } from "@libsql/client";
import { createAppAuth } from "@octokit/auth-app";
import {
  GitHubSourceControl,
  githubErrorMod,
} from "@dxta/source-control";
import { drizzle } from "drizzle-orm/libsql";
import { getTenantSourceControl } from "@dxta/super-schema";

import { getEnv } from "./env";

function getGithubAppPrivateKey() {
  return getEnv().GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n");
}

async function getGithubAppInstallationToken(installationId: number) {
  const auth = createAppAuth({
    appId: getEnv().GITHUB_APP_ID,
    privateKey: getGithubAppPrivateKey(),
  });

  const { token } = await auth({ type: "installation", installationId });
  return token;
}

async function getGithubInstallationId(tenantId: number) {
  const superDb = initSuperDatabase();
  const sourceControl = await getTenantSourceControl(superDb, tenantId, "github");

  if (!sourceControl?.githubInstallationId) {
    throw new Error(
      `Missing GitHub installation id for tenant ${tenantId}.`,
    );
  }

  return sourceControl.githubInstallationId;
}

export function initDatabase(dbUrl: string) {
  return drizzle(
    createClient({
      url: dbUrl,
      authToken: getEnv().TENANT_DATABASE_AUTH_TOKEN,
    }),
  );
}

export function initSuperDatabase() {
  const env = getEnv();
  return drizzle(
    createClient({
      url: env.SUPER_DATABASE_URL,
      authToken: env.SUPER_DATABASE_AUTH_TOKEN,
    }),
  );
}

type InitSourceControlInput = {
  tenantId: number;
  sourceControl: "github";
  options?: {
    fetchTimelineEventsPerPage?: number;
  };
};

export async function initSourceControl({
  tenantId,
  sourceControl,
  options,
}: InitSourceControlInput) {
  if (sourceControl === "github") {
    const installationId = await getGithubInstallationId(tenantId);
    const accessToken = await getGithubAppInstallationToken(installationId);
    const githubClient = new GitHubSourceControl({
      auth: accessToken,
      fetchTimelineEventsPerPage: options?.fetchTimelineEventsPerPage,
    });
    return githubErrorMod(githubClient);
  }

  throw new Error(`Unsupported source control provider: ${sourceControl}`);
}

import { GitHubSourceControl, GitlabSourceControl, type SourceControl } from "@dxta/source-control"
import type { Tenant } from "@dxta/super-schema"
import type { LibSQLDatabase } from "drizzle-orm/libsql"
import { clerkClient } from "@clerk/fastify";
import { tenantDb } from "./tenant-db";

const getUserForgeAccessToken = async (userId: string, forge: "github" | "gitlab") => {
  const userTokens = await clerkClient.users.getUserOauthAccessToken(userId, `oauth_${forge}`);
  if (userTokens[0] === undefined) throw new Error("no token");
  return userTokens[0].token;
}

type BaseExtractContext = {
  db: LibSQLDatabase,
  integrations: {
    sourceControl: SourceControl | null
  }
}

type ExtractContextOptions = {
  tenant: Tenant;
  userId: string;
  forge: "github" | "gitlab";
}

export const extractContext: {
  <TExtendedContext extends { integrations?: object } | object>(opts: ExtractContextOptions, ctx: TExtendedContext): Promise<TExtendedContext & BaseExtractContext>;
} = async ({ tenant, userId, forge }, ctx) => {
  const token = await getUserForgeAccessToken(userId, forge);

  let sourceControl = null;
  if (forge === "github") sourceControl = new GitHubSourceControl({ auth: token });
  else if (forge === "gitlab") sourceControl = new GitlabSourceControl(token);

  const ctxIntegrations = ('integrations' in ctx) ? ctx.integrations : {};

  return {
    ...ctx,
    db: tenantDb(tenant),
    integrations: {
      ...ctxIntegrations,
      sourceControl
    }
  }
}

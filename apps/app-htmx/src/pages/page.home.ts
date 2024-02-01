import { getAuth } from "@clerk/fastify";
import type { RouteHandlerMethod } from "fastify";
import { redirectToSignIn } from "./redirect-to-sign-in";
import { pageContext } from "src/context/page.context";
import { htmxContext } from "src/context/htmx.context";
import { tenantListContext } from "src/context/tenant-list.context";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { getRepositories } from "src/functions/get-repositories";
import { z } from "zod";
import { AppConfig } from "src/app-config";
import { getCrawlStats } from "src/functions/get-crawl-stats";

const QuerySchema = z.object({
  tenant: z.string().optional()
});

export const Home: RouteHandlerMethod = async (request, reply) => {
  const auth = getAuth(request);
  if (!auth.sessionId) return redirectToSignIn(reply);

  const parsedQuery = QuerySchema.safeParse(request.query);
  const query = parsedQuery.success ? parsedQuery.data : {};

  const page = pageContext("Home");
  const htmx = htmxContext(request.headers);
  const tenantList = tenantListContext();


  const tenantQuery = query.tenant || tenantList.tenantList[0]!.name;
  const tenant = tenantList.tenantList.find(t => t.name === tenantQuery);
  if (!tenant) return reply.redirect(303, "/");
  const targetTenantId = tenant.id;

  const db = drizzle(createClient({
    url: tenant.dbUrl,
    authToken: AppConfig.tenantDatabaseAuthToken
  }));

  const repos = await getRepositories(db);
  
  const tenantCrawlStats = await getCrawlStats(tenant);

  return reply.view("page.home.html", {
    auth,
    ...page,
    ...htmx,
    ...tenantList,
    targetTenant: tenant,
    targetTenantId,
    repos,
    dates: {
      yesterday: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0, 10),
      today: new Date().toISOString().slice(0, 10)
    },
    AppConfig,
    tenantCrawlStats
  });
}

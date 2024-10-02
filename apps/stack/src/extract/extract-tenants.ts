import { createMessageHandler } from "@stack/config/create-message";
import { MessageKind, metadataSchema } from "./messages";
import { z } from "zod";
import { namespaces, repositories } from "@dxta/extract-schema";
import { eq } from "drizzle-orm";
import { repositorySenderHandler } from "./extract-repository";
import { ApiHandler, useJsonBody } from "sst/node/api";
import { timePeriodOf } from "@stack/config/time-period";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { getTenants } from "@dxta/super-schema";
import { Config } from "sst/node/config";
import { initDatabase } from "./context";

export const tenantSenderHandler = createMessageHandler({
  queueId: 'ExtractQueue',
  kind: MessageKind.Tenant,
  metadataShape: metadataSchema.omit({ sourceControl: true, crawlId: true }).shape,
  contentShape: z.object({
    dbUrl: z.string(),
    crawlUserId: z.string(),
  }).shape,
  handler: async (message) => { 
    
    const db = initDatabase(message.content);
    const repos = await db.select({
      repositoryName: repositories.name,
      externalRepositoryId: repositories.externalId,
      namespaceName: namespaces.name,
      forgeType: repositories.forgeType,  
    })
    .from(repositories)
    .innerJoin(namespaces, eq(repositories.namespaceId, namespaces.id))
    .all();

    if (repos.length === 0) {
      console.log(`Warn: no repositories to extract for tenant: ${message.content.dbUrl}`);
      return;
    }
 
    await repositorySenderHandler.sender.sendAll(repos, {
      version: 1,
      caller: 'extract-tenant:queueHandler',
      timestamp: Date.now(),
      userId: message.content.crawlUserId,
      from: message.metadata.from,
      to: message.metadata.to,
      dbUrl: message.content.dbUrl,
    });
  }
});
const { sender } = tenantSenderHandler;

export const cronHandler = async ()=> {

  const superDb = drizzle(createClient({ url: Config.SUPER_DATABASE_URL, authToken: Config.SUPER_DATABASE_AUTH_TOKEN }));
  const tenants = await getTenants(superDb);
  const cronEnabledTenants = tenants.filter(x => x.crawlUserId !== '');
  const tenantCrawlInput = cronEnabledTenants.map(tenant => ({ dbUrl: tenant.dbUrl, crawlUserId: tenant.crawlUserId }));

  const PERIOD_DURATION = 15 * 60 * 1000; // 15 minutes
  const PERIOD_START_MARGIN = 5 * 60 * 1000; // 5 minutes
  const PERIOD_LATENCY = 8 * 60 * 1000; // extract delay
  const { from, to } = timePeriodOf(Date.now(), PERIOD_DURATION, PERIOD_START_MARGIN, -PERIOD_LATENCY);
  
  await sender.sendAll(tenantCrawlInput, {
    version: 1,
    caller: 'extract-tenant:cronHandler',
    timestamp: Date.now(),
    userId: '',
    from,
    to,
    dbUrl: '', // required since create-event and create-message require this to be present in metadata, although this isnt a "crawl-function"
  });
   
};

const contextSchema = z.object({
  authorizer: z.object({
    jwt: z.object({
      claims: z.object({
        sub: z.string(),
      }),
    }),
  }),
});

const inputSchema = z.object({
  tenant: z.number(),
  from: z.coerce.date(),
  to: z.coerce.date()
});

export const apiHandler = ApiHandler(async (ev) => {
  
  const body = useJsonBody() as unknown;

  const lambdaContextValidation = contextSchema.safeParse(ev.requestContext);

  if (!lambdaContextValidation.success) {
    console.log("Error: Authorization failed - ", lambdaContextValidation.error.issues); // TODO: compliance check, might be insufficient_scope or something
    return {
      statusCode: 401,
      body: JSON.stringify({ message: "Unauthorized" }),
    }
  }

  const inputValidation = inputSchema.safeParse(body);

  if (!inputValidation.success) {
    console.log("Error: Input validation failed - ", inputValidation.error.issues);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: inputValidation.error.toString() }),
    }
  }

  const { tenant: tenantId, from, to } = inputValidation.data;
  const { sub } = lambdaContextValidation.data.authorizer.jwt.claims;

  const superDb = drizzle(createClient({ url: Config.SUPER_DATABASE_URL, authToken: Config.SUPER_DATABASE_AUTH_TOKEN }));
  const tenants = await getTenants(superDb);
  const tenant = tenants.find(tenant => tenant.id === tenantId);
  if (!tenant) return {
    statusCode: 404,
    message: JSON.stringify({ error: "Tenant not found" })
  }

  await sender.sendAll([{ dbUrl: tenant.dbUrl, crawlUserId: sub }], {
    version: -1,
    caller: 'extract-tenant:apiHandler',
    timestamp: Date.now(),
    userId: '',
    from,
    to,
    dbUrl: '', // required since create-event and create-message require this to be present in metadata, although this isnt a "crawl-function"
  });
  return {
    statusCode: 200,
    body: JSON.stringify({ message: `Extracting tenant ${tenant.name} repositories in period (${from.toISOString()}...${to.toISOString()})` })
  };
});

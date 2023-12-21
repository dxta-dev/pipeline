import { createMessageHandler } from "@stack/config/create-message";
import { MessageKind, metadataSchema } from "./messages";
import { z } from "zod";
import { getTenants } from "@stack/config/tenants";
import { getTenantDb } from "@stack/config/get-tenant-db";
import { namespaces, repositories } from "@acme/extract-schema";
import { eq } from "drizzle-orm";
import { repositorySenderHandler } from "./extract-repository";

export const tenantSenderHandler = createMessageHandler({
  queueId: 'ExtractQueue',
  kind: MessageKind.Tenant,
  metadataShape: metadataSchema.omit({ sourceControl: true, crawlId: true }).shape,
  contentShape: z.object({
    tenantId: z.number(),
  }).shape,
  handler: async (message) => {
    const db = getTenantDb(message.content.tenantId);

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
      console.log(`Warn: no repositories to extract for tenant: ${message.content.tenantId}`);
      return;
    }
 
    await repositorySenderHandler.sender.sendAll(repos, {
      version: 1,
      caller: 'extract-tenant:queueHandler',
      timestamp: Date.now(),
      userId: message.metadata.userId,
      from: message.metadata.from,
      to: message.metadata.to,
      tenantId: message.content.tenantId,
    });
  }
});
const { sender } = tenantSenderHandler;

const CRON_ENV = z.object({
  CRON_USER_ID: z.string(),
});
export const cronHandler = async ()=> {
  const validEnv = CRON_ENV.safeParse(process.env);

  if (!validEnv.success) {
    console.error("Invalid environment in lambda 'extract-tenant.cronHandler':", ...validEnv.error.issues);
    throw new Error("Invalid environment");
  }

  const { CRON_USER_ID } = validEnv.data;

  const tenants = getTenants();
  const tenantIds = tenants.map(tenant => ({ tenantId: tenant.id }));

  const utcTodayAt10AM = new Date();
  utcTodayAt10AM.setUTCHours(10, 0, 0, 0);
  const utcYesterdayAt10AM = new Date(utcTodayAt10AM);
  utcYesterdayAt10AM.setHours(utcTodayAt10AM.getUTCHours() - 24);

  await sender.sendAll(tenantIds, {
    version: 1,
    caller: 'extract-tenant:cronHandler',
    timestamp: Date.now(),
    userId: CRON_USER_ID,
    from: utcYesterdayAt10AM,
    to: utcTodayAt10AM,
    tenantId: -1, // -1 means no db access ?
  });
   
};


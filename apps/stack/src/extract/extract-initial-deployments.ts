import { z } from "zod";
import { repositories, namespaces } from "@dxta/extract-schema";
import { Config } from "sst/node/config";
import { eq } from "drizzle-orm";
import { deploymentEnvironments } from "@dxta/tenant-schema";
import { initDatabase } from "./context";
import { ApiHandler, useJsonBody } from "sst/node/api";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { getTenants } from "@dxta/super-schema";
import { deploymentsSenderHandler, extractDeploymentsPage } from "./extract-deployments";
import { setInstance } from "@dxta/crawl-functions";
import { instances } from "@dxta/crawl-schema";

const { sender } = deploymentsSenderHandler;

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
  deploymentId: z.number(),
  firstPage: z.number().default(1), // note: github api pages sort by created_at desc
  lastPage: z.number().optional(),
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

  const { tenant: tenantId, deploymentId, firstPage, lastPage } = inputValidation.data;
  const { sub } = lambdaContextValidation.data.authorizer.jwt.claims;

  const superDb = drizzle(createClient({ url: Config.SUPER_DATABASE_URL, authToken: Config.SUPER_DATABASE_AUTH_TOKEN }));
  const tenants = await getTenants(superDb);
  const tenant = tenants.find(tenant => tenant.id === tenantId);
  if (!tenant) return {
    statusCode: 404,
    message: JSON.stringify({ error: "Tenant not found" })
  }

  const db = initDatabase({ dbUrl: tenant.dbUrl });
  const target = await db.select({
    repository: repositories,
    namespace: namespaces,
    deployment: deploymentEnvironments,
  })
    .from(deploymentEnvironments)
    .where(eq(deploymentEnvironments.id, deploymentId))
    .innerJoin(repositories, eq(repositories.externalId, deploymentEnvironments.repositoryExternalId))
    .innerJoin(namespaces, eq(repositories.namespaceId, namespaces.id))
    .get();

  if (!target) return {
    statusCode: 404,
    body: JSON.stringify({ message: `Invalid deployment id ${deploymentId} for tenant ${tenant.name}` }),
  }

  const nullDurationDateAt = new Date();

  let instanceId = -1;
  try {
    const crawl = await setInstance({ repositoryId: target.repository.id, userId: sub, since: nullDurationDateAt, until: nullDurationDateAt }, { db, entities: { instances } });
    instanceId = crawl.instanceId;
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Failed to create deployment crawl instance for repository ${target.namespace.name}/${target.repository.name}` }),
    }
  }

  let firstPageResult: Awaited<ReturnType<typeof extractDeploymentsPage>>;
  try {
    firstPageResult = await extractDeploymentsPage({
      namespace: target.namespace,
      repository: target.repository,
      crawlId: instanceId,
      dbUrl: tenant.dbUrl,
      from: nullDurationDateAt,
      to: nullDurationDateAt,
      page: firstPage,
      perPage: Number(Config.PER_PAGE),
      sourceControl: target.repository.forgeType,
      userId: sub,
      environment: target.deployment.environment,
    });
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Failed to retrieve first page #${firstPage} of deployments for repository ${target.namespace.name}/${target.repository.name}` }),
    }
  }

  const totalPages = lastPage || firstPageResult.pagination.totalPages;
  const arrayOfExtractDeploymentsPageMessageContent: Parameters<typeof deploymentsSenderHandler.sender.send>[0][] = [];
  for (let page = firstPage + 1; page <= totalPages; page++) {
    arrayOfExtractDeploymentsPageMessageContent.push({
      namespace: target.namespace,
      repository: target.repository,
      page: page,
      perPage: Number(Config.PER_PAGE),
      environment: target.deployment.environment,
    });
  }


  if (arrayOfExtractDeploymentsPageMessageContent.length === 0)  {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Extracted ${firstPageResult.deployments.length} deployments for tenant ${tenant.name} repository ${target.namespace.name}/${target.repository.name}` }),
    }   
  }

  try {
    await sender.sendAll(arrayOfExtractDeploymentsPageMessageContent, {
      version: 1,
      caller: 'extract-deployments',
      sourceControl: target.repository.forgeType,
      userId: sub,
      timestamp: new Date().getTime(),
      from: nullDurationDateAt,
      to: nullDurationDateAt,
      crawlId: instanceId,
      dbUrl: tenant.dbUrl,
    });      
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Failed to enqueue pages ${firstPage + 1}..${totalPages} for tenant ${tenant.name} repository ${target.namespace.name}/${target.repository.name}` }),
    }
  }

  return {    
    statusCode: 200,
    body: JSON.stringify({ message: `Extracted ${firstPageResult.deployments.length} deployments and enqueued pages ${firstPage + 1}..${totalPages} for tenant ${tenant.name} repository ${target.namespace.name}/${target.repository.name}` }),
  }

});

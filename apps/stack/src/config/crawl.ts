import { insertEvent } from "@acme/crawl-functions";
import { events } from "@acme/crawl-schema";
import type { Context, InsertEventEntities } from "@acme/crawl-functions";
import type { EventNamespaceType } from "@acme/crawl-schema/src/events";
import { getTenantDb, type OmitDb, type Tenancy } from "./get-tenant-db";

const context: OmitDb<Context<InsertEventEntities>> = {
  entities: {
    events
  }
};

export const crawlFailed = (isCrawlMessage: boolean, tenantId: Tenancy['id'], crawlId: number | undefined, namespace: EventNamespaceType | undefined, error: unknown) => {
  if(namespace === undefined || !isCrawlMessage) {
    return;
  }

  if(crawlId === undefined) {
    console.error(`ERROR: crawlFailed called with undefined crawlId. Namespace: ${namespace}`); // what's undefined?
    return;
  }

  return insertEvent({
    crawlId: crawlId,
    eventDetail: 'crawlFailed',
    data: {
      message: (error instanceof Error) ? error.toString() : `Error: ${JSON.stringify(error)}`,
    },
    eventNamespace: namespace
  }, {...context, db: getTenantDb(tenantId) });
};

export const crawlComplete = (isCrawlMessage: boolean, tenantId: Tenancy['id'], crawlId: number | undefined, namespace: EventNamespaceType | undefined) => {
  if(namespace === undefined || !isCrawlMessage) {
    return;
  }

  if(crawlId === undefined) {
    console.error(`ERROR: crawlFailed called with undefined crawlId. Namespace: ${namespace}`); // what's undefined?
    return;
  }

  return insertEvent({
    crawlId: crawlId,
    eventDetail: 'crawlComplete',
    data: {},
    eventNamespace: namespace
  }, {...context, db: getTenantDb(tenantId) });
}

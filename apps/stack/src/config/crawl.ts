import { insertEvent } from "@acme/crawl-functions";
import { events } from "@acme/crawl-schema";
import type { Context, InsertEventEntities } from "@acme/crawl-functions";
import type { EventNamespaceType } from "@acme/crawl-schema/src/events";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { Config } from "sst/node/config";

const context: Context<InsertEventEntities> = {
  db: drizzle(createClient({
    url: Config.CRAWL_DATABASE_URL,
    authToken: Config.CRAWL_DATABASE_AUTH_TOKEN,
  })),
  entities: {
    events
  }
};

export const crawlFailed = (crawlId: number, namespace: EventNamespaceType, error: unknown) => {
  return insertEvent({
    crawlId: crawlId,
    eventDetail: 'crawlFailed',
    data: {
      message: (error instanceof Error) ? error.toString() : `Error: ${JSON.stringify(error)}`,
    },
    eventNamespace: namespace
  }, context);
};

export const crawlComplete = (crawlId: number, namespace: EventNamespaceType) => {
  return insertEvent({
    crawlId: crawlId,
    eventDetail: 'crawlComplete',
    data: {},
    eventNamespace: namespace
  }, context);
}
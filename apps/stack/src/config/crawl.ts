import { insertEvent } from "@dxta/crawl-functions";
import { events } from "@dxta/crawl-schema";
import type { Context, InsertEventEntities } from "@dxta/crawl-functions";
import type { EventNamespaceType } from "@dxta/crawl-schema/src/events";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

const context: Omit<Context<InsertEventEntities>, "db"> = {
  entities: {
    events,
  },
};

type CrawlDatabase = LibSQLDatabase<Record<string, never>>;

export const crawlFailed = (
  isCrawlMessage: boolean,
  db: CrawlDatabase | undefined,
  crawlId: number | undefined,
  namespace: EventNamespaceType | undefined,
  error: unknown,
) => {
  if (namespace === undefined || !isCrawlMessage || db === undefined) {
    return;
  }

  if (crawlId === undefined) {
    console.error(
      `ERROR: crawlFailed called with undefined crawlId. Namespace: ${namespace}`,
    ); // what's undefined?
    return;
  }

  return insertEvent(
    {
      crawlId: crawlId,
      eventDetail: "crawlFailed",
      data: {
        message:
          error instanceof Error
            ? error.toString()
            : `Error: ${JSON.stringify(error)}`,
      },
      eventNamespace: namespace,
    },
    { ...context, db },
  );
};

export const crawlComplete = (
  isCrawlMessage: boolean,
  db: CrawlDatabase | undefined,
  crawlId: number | undefined,
  namespace: EventNamespaceType | undefined,
) => {
  if (namespace === undefined || !isCrawlMessage || db === undefined) {
    return;
  }

  if (crawlId === undefined) {
    console.error(
      `ERROR: crawlFailed called with undefined crawlId. Namespace: ${namespace}`,
    ); // what's undefined?
    return;
  }

  return insertEvent(
    {
      crawlId: crawlId,
      eventDetail: "crawlComplete",
      data: {},
      eventNamespace: namespace,
    },
    { ...context, db },
  );
};

import { insertEvent } from "@acme/crawl-functions";
import { events } from "@acme/crawl-schema";
import type { Context, InsertEventEntities } from "@acme/crawl-functions";
import type { CrawlComplete, EventNamespaceType } from "@acme/crawl-schema/src/events";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { Config } from "sst/node/config";

type CrawlHandlerInput = {
  metadata: {
    crawlId: number;
  }
}

type HandlerResponse = {
  page: number;
  ids: number[];
  metadata: {
    crawlId: number;

}

const context: Context<InsertEventEntities> = {
  db: drizzle(createClient({
    url: Config.CRAWL_DATABASE_URL,
    authToken: Config.CRAWL_DATABASE_AUTH_TOKEN,
  })),
  entities: {
    events
  }
};

export const CrawlHandler = (eventNamespace: EventNamespaceType, handler: (input: CrawlHandlerInput) => Promise<void>) => async (input: CrawlHandlerInput) => {
    let error = null;

    try {
        await handler(input);
    } catch (e) {
      error = e;
    }

    if (!error) {
      await insertEvent({
        crawlId: input.metadata.crawlId,
        data: {
          page: input.page,
          ids: input.ids,
        },
        eventDetail: 'crawlComplete',
        eventNamespace: eventNamespace
      }, context);

    } else {
      const errorMessage = (error instanceof Error) ? error.toString() : `Error: ${JSON.stringify(error)}`;
      await insertEvent({
        crawlId: input.metadata.crawlId,
        eventDetail: 'crawlFailed',
        data: {
          page: input.page,
          ids: input.ids,
          message: errorMessage
        },
        eventNamespace
      }, context);
    }

  }


export function log() {
}

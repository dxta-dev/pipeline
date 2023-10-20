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
type CrawlHandlerOutput = Promise<CrawlComplete>;


const context: Context<InsertEventEntities> = {
  db: drizzle(createClient({
    url: Config.CRAWL_DATABASE_URL,
    authToken: Config.CRAWL_DATABASE_AUTH_TOKEN,
  })),
  entities: {
    events
  }
};

export const CrawlHandler = <TInput extends CrawlHandlerInput, TEventNamespace extends EventNamespaceType>
  (eventNamespace: TEventNamespace, handler: (input: TInput) => CrawlHandlerOutput) => async (input: TInput) => {

    try {
      const crawlResult = await handler(input);
      await insertEvent({
        crawlId: input.metadata.crawlId,
        data: {
          page: crawlResult.page,
          ids: crawlResult.ids,
        },
        eventDetail: 'crawlComplete',
        eventNamespace: eventNamespace
      }, context);

    } catch (error) {
      const errorMessage = (error instanceof Error) ? error.toString() : `Error: ${JSON.stringify(error)}`;
      await insertEvent({
        crawlId: input.metadata.crawlId,
        eventDetail: 'crawlFailed',
        data: {
          page: 0, // ????????
          message: errorMessage
        },
        eventNamespace
      }, context);
    }

  }
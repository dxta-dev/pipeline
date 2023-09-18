import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { Config } from "sst/node/config";
import { EventHandler } from "sst/node/event-bus";

import { extractRepositoryEvent } from "@stack/extract/events";
import type { Context, SetRepositoryExtractEntities, SetRepositoryTransformEntities } from "@acme/transform-functions";

// const context: Context<SetRepositoryExtractEntities, SetRepositoryTransformEntities> = {
//   extract: {
// db: drizzle(createClient({ url: Config.DATABASE_URL, authToken: Config.DATABASE_AUTH_TOKEN }))
//   },
//   transform: {
// db:drizzle(createClient({url:Config.}))
//   }
// }

export const eventHandler = EventHandler(extractRepositoryEvent, async (evt) => {
  console.log("it is alive !!!");
});
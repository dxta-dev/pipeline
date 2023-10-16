import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { Config } from "sst/node/config";
import { EventHandler } from "@stack/config/create-event";

import { extractRepositoryEvent } from "@stack/extract/events";
import * as extract from "@acme/extract-schema";
import * as transform from "@acme/transform-schema";
import type { Context, SetRepositoryExtractEntities, SetRepositoryTransformEntities } from "@acme/transform-functions";
import { setRepository } from "@acme/transform-functions";

const context: Context<SetRepositoryExtractEntities, SetRepositoryTransformEntities> = {
  extract: {
    db: drizzle(createClient({ url: Config.EXTRACT_DATABASE_URL, authToken: Config.EXTRACT_DATABASE_AUTH_TOKEN })),
    entities: {
      repositories: extract.repositories
    }
  },
  transform: {
    db: drizzle(createClient({ url: Config.TRANSFORM_DATABASE_URL, authToken: Config.TRANSFORM_DATABASE_AUTH_TOKEN })),
    entities: {
      repositories: transform.repositories
    }
  }
}

export const eventHandler = EventHandler(extractRepositoryEvent, async (evt) => {
  await setRepository({ extractRepositoryId: evt.properties.repositoryId }, context);
});
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { Config } from "sst/node/config";
import { EventHandler } from "@stack/config/create-event";

import { extractMergeRequestsEvent } from "@stack/extract/events";
import * as extract from "@acme/extract-schema";
import * as transform from "@acme/transform-schema";
import type { Context, SetMergeRequestDiffsTransformEntities, SetMergeRequestDiffsExtractEntities } from "@acme/transform-functions";

import { calculateMergeRequestSize } from "@acme/transform-functions";

const context: Context<SetMergeRequestDiffsExtractEntities, SetMergeRequestDiffsTransformEntities> = {
  extract: {
    db: drizzle(createClient({ url: Config.EXTRACT_DATABASE_URL, authToken: Config.EXTRACT_DATABASE_AUTH_TOKEN })),
    entities: {
        mergeRequestDiffs: extract.mergeRequestDiffs,
        repositories: extract.repositories,
        mergeRequests: extract.mergeRequests
    }
  },
  transform: {
    db: drizzle(createClient({ url: Config.TRANSFORM_DATABASE_URL, authToken: Config.TRANSFORM_DATABASE_AUTH_TOKEN })),
    entities: {
      mergeRequests: transform.mergeRequests
    }
  }
}

export const eventHandler = EventHandler(extractMergeRequestsEvent, async (evt) => {
  for (let i = 0; i < evt.properties.mergeRequestIds.length; i++)
  {
    await calculateMergeRequestSize({ extractMergeRequestId: evt.properties.mergeRequestIds[i] as number }, context);
  }
});
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { Config } from "sst/node/config";
import { EventHandler } from "@stack/config/create-event";

import { extractMergeRequestsEvent } from "@stack/extract/events";
import * as extract from "@acme/extract-schema";
import * as transform from "@acme/transform-schema";
import type { Context, SetMergeRequestsTransformEntities, SetMergeRequestsExtractEntities, SetMergeRequestMetricsExtractEntities, SetMergeRequestMetricsTransformEntities } from "@acme/transform-functions";

import { setMergeRequestMetrics, setMergeRequests } from "@acme/transform-functions";

const context: Context<SetMergeRequestsExtractEntities, SetMergeRequestsTransformEntities> = {
  extract: {
    db: drizzle(createClient({ url: Config.EXTRACT_DATABASE_URL, authToken: Config.EXTRACT_DATABASE_AUTH_TOKEN })),
    entities: {
      mergeRequests: extract.mergeRequests,
      repositories: extract.repositories
    }
  },
  transform: {
    db: drizzle(createClient({ url: Config.TRANSFORM_DATABASE_URL, authToken: Config.TRANSFORM_DATABASE_AUTH_TOKEN })),
    entities: {
      mergeRequests: transform.mergeRequests
    }
  }
}

const contextMetrics: Context<SetMergeRequestMetricsExtractEntities, SetMergeRequestMetricsTransformEntities> = {
  extract: {
    db: drizzle(createClient({ url: Config.EXTRACT_DATABASE_URL, authToken: Config.EXTRACT_DATABASE_AUTH_TOKEN })),
    entities: {
      mergeRequests: extract.mergeRequests,
      repositories: extract.repositories
    }
  },
  transform: {
    db: drizzle(createClient({ url: Config.TRANSFORM_DATABASE_URL, authToken: Config.TRANSFORM_DATABASE_AUTH_TOKEN })),
    entities: {
      mergeRequestMetrics: transform.mergeRequestMetrics,
      dates: transform.dates,
      mergeRequestDatesJunk: transform.mergeRequestDatesJunk
    }
  }
}

export const eventHandler = EventHandler(extractMergeRequestsEvent, async (evt) => {
  await setMergeRequests({ extractMergeRequestIds: evt.properties.mergeRequestIds }, context);
  await setMergeRequestMetrics({extractMergeRequestIds: evt.properties.mergeRequestIds}, contextMetrics);
});
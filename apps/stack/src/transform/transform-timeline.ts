import { ApiHandler } from "sst/node/api";
import { z } from "zod";
import * as extract from "@acme/extract-schema";
import * as transform from "@acme/transform-schema";
import { type LibSQLDatabase, drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import type { Context, ExtractEntities, TransformEntities } from "@acme/transform-functions";
import { Config } from "sst/node/config";

import { seed } from "@acme/transform-schema/src/seed/dimensions";

const apiContextSchema = z.object({
  authorizer: z.object({
    jwt: z.object({
      claims: z.object({
        sub: z.string(),
      }),
    }),
  }),
});

const context = {
  extract: {
    db: drizzle(createClient({ url: Config.EXTRACT_DATABASE_URL, authToken: Config.EXTRACT_DATABASE_AUTH_TOKEN })),
    entities: {
      mergeRequests: extract.mergeRequests,
    }
  },
  transform: {
    db: drizzle(createClient({ url: Config.TRANSFORM_DATABASE_URL, authToken: Config.TRANSFORM_DATABASE_AUTH_TOKEN })),
    entities: {
      dates: transform.dates,
    }
  }
} satisfies Context<Partial<ExtractEntities>, Partial<TransformEntities>>;

export const apiHandler = ApiHandler(async (ev) => {

  const lambdaContextValidation = apiContextSchema.safeParse(ev.requestContext);
  if (!lambdaContextValidation.success) return {
    statusCode: 401,
    body: JSON.stringify(lambdaContextValidation.error),
  }

  // TODO: To seed or not to seed.. ?
  const A_YEAR = 12 * 30 * 24 * 60 * 60 * 1000;
  const nowInMs = new Date().getTime();
  const firstDates = await context.transform.db.select({
    id: context.transform.entities.dates.id
  })
    .from(context.transform.entities.dates)
    .limit(1)
    .all();
  if (firstDates.length === 0) await seed(context.transform.db as LibSQLDatabase, new Date(nowInMs - A_YEAR), new Date(nowInMs + A_YEAR));

  const allMergeRequests = await context.extract.db.select({
    mergeRequestId: context.extract.entities.mergeRequests.id
  })
    .from(context.extract.entities.mergeRequests)
    .all();

  if (allMergeRequests.length === 0) return {
    statusCode: 412,
    body: JSON.stringify({ error: new Error("No extracted merge request found").toString() }),
  }

  // TODO: This endpoint shouldn't be a teapot
  return {
    statusCode: 418,
    body: JSON.stringify({ message: 'teapot' })
  }
});
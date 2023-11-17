import { ApiHandler } from "sst/node/api";
import { z } from "zod";
import * as extract from "@acme/extract-schema";
import * as transform from "@acme/transform-schema";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import type { Context, ExtractEntities, TransformEntities } from "@acme/transform-functions";
import { Config } from "sst/node/config";

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
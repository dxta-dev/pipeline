import {
  type StackContext,
  use,
  Config,
  Api,
  Queue,
  Cron,
} from "sst/constructs";
import { ExtractStack } from "./ExtractStack";
import { z } from "zod";

export function TransformStack({ stack }: StackContext) {

  const {
    EXTRACT_DATABASE_AUTH_TOKEN,
    EXTRACT_DATABASE_URL,
    CRAWL_DATABASE_URL,
    CRAWL_DATABASE_AUTH_TOKEN,
  } = use(ExtractStack);
  const TRANSFORM_DATABASE_URL = new Config.Secret(stack, "TRANSFORM_DATABASE_URL");
  const TRANSFORM_DATABASE_AUTH_TOKEN = new Config.Secret(stack, "TRANSFORM_DATABASE_AUTH_TOKEN");

  const transformTestingQueue = new Queue(stack, "TransformTestQueue");
  transformTestingQueue.addConsumer(stack, {
    cdk: {
      eventSource: {
        batchSize: 1,
        maxConcurrency: 20,
      },
    },
    function: {
      bind: [
        TRANSFORM_DATABASE_URL,
        TRANSFORM_DATABASE_AUTH_TOKEN,  
        EXTRACT_DATABASE_URL,
        EXTRACT_DATABASE_AUTH_TOKEN,
        CRAWL_DATABASE_AUTH_TOKEN,
        CRAWL_DATABASE_URL,
    ],
      handler: "src/transform/transform-timeline.queueHandler",
    },

  })

  const ENVSchema = z.object({
    CLERK_JWT_ISSUER: z.string(),
    CLERK_JWT_AUDIENCE: z.string(),
    PUBLIC_REPOS: z.string(),
  });
  const publicReposSchema = z.array(
    z.object({
      owner: z.string(),
      name: z.string(),
    })
  );

  const ENV = ENVSchema.parse(process.env);
  const PUBLIC_REPOS = publicReposSchema.parse(JSON.parse(ENV.PUBLIC_REPOS));

  const api = new Api(stack, "TransformApi", {
    defaults: {
      authorizer: "JwtAuthorizer",
      function: {
        bind: [
          transformTestingQueue,
          TRANSFORM_DATABASE_URL,
          TRANSFORM_DATABASE_AUTH_TOKEN,  
          EXTRACT_DATABASE_URL,
          EXTRACT_DATABASE_AUTH_TOKEN,
          CRAWL_DATABASE_AUTH_TOKEN,
          CRAWL_DATABASE_URL,
          // bus, 
          // CLERK_SECRET_KEY, 
          // REDIS_URL, 
          // REDIS_TOKEN, 
          // REDIS_USER_TOKEN_TTL
        ],
        runtime: "nodejs18.x",
      },
    },
    authorizers: {
      JwtAuthorizer: {
        type: "jwt",
        identitySource: ["$request.header.Authorization"],
        jwt: {
          issuer: ENV.CLERK_JWT_ISSUER,
          audience: [ENV.CLERK_JWT_AUDIENCE],
        },
      },
    },
    routes: {
      "POST /start": "src/transform/transform-timeline.apiHandler",
    },
  });

  if (PUBLIC_REPOS.length !== 0) {
    new Cron(stack, `TransformCron`, {
      schedule: "cron(00 13 * * ? *)",
      job: {
        function: {
          handler: "src/extract/transform-timeline.cronHandler",
          bind: [
            transformTestingQueue,
            EXTRACT_DATABASE_URL,
            EXTRACT_DATABASE_AUTH_TOKEN,
            CRAWL_DATABASE_URL,
            CRAWL_DATABASE_AUTH_TOKEN,
          ],
          runtime: "nodejs18.x",
        }
      }
    });
  }

  stack.addOutputs({
    ApiEndpoint: api.url,
  });


}
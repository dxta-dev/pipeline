import {
  type StackContext,
  use,
  Api,
  Queue,
  Cron,
} from "sst/constructs";
import { ExtractStack } from "./ExtractStack";
import { z } from "zod";

export function TransformStack({ stack }: StackContext) {
  const ENVSchema = z.object({
    CLERK_JWT_ISSUER: z.string(),
    CLERK_JWT_AUDIENCE: z.string(),
    TENANTS: z.string(),
    CRON_DISABLED: z.literal('true').optional(),
  });
  const ENV = ENVSchema.parse(process.env);

  const {
    TENANT_DATABASE_URL,
    TENANT_DATABASE_AUTH_TOKEN,
} = use(ExtractStack);
  const transformTestingQueue = new Queue(stack, "TransformTestQueue");
  transformTestingQueue.addConsumer(stack, {
    cdk: {
      eventSource: {
        batchSize: 1,
        maxConcurrency: 20,
      },
    },
    function: {
      environment: {
        TENANTS: ENV.TENANTS,
      },
      bind: [
        TENANT_DATABASE_URL,
        TENANT_DATABASE_AUTH_TOKEN,
    ],
      handler: "src/transform/transform-timeline.queueHandler",
    },

  })

  const api = new Api(stack, "TransformApi", {
    defaults: {
      authorizer: "JwtAuthorizer",
      function: {
        environment: {
          TENANTS: ENV.TENANTS,
        },
        bind: [
          transformTestingQueue,
          TENANT_DATABASE_URL,
          TENANT_DATABASE_AUTH_TOKEN,
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

  const tenantsSchema = z.array(
    z.object({
      id: z.number(),
      tenant: z.string(),
      dbUrl: z.string(),
    })
  );
  const tenants = tenantsSchema.parse(JSON.parse(ENV.TENANTS));
  if (ENV.CRON_DISABLED !== 'true') {
    tenants.forEach(tenant=>{
      new Cron(stack, `${tenant.tenant}_TransformCron`, {
        schedule: "cron(00 13 * * ? *)",
        job: {
          function: {
            handler: "src/extract/transform-timeline.cronHandler",
            environment: {
              TENANTS: ENV.TENANTS,
              TENANT_ID: tenant.id.toString(),
            },
            bind: [
              transformTestingQueue,
              TENANT_DATABASE_URL,
              TENANT_DATABASE_AUTH_TOKEN,
              ],
            runtime: "nodejs18.x",
          }
        }
      });  
    })
  }

  stack.addOutputs({
    ApiEndpoint: api.url,
  });


}
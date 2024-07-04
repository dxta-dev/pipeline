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
    CRON_DISABLED: z.literal('true').or(z.any()).optional(),
    OTEL_DISABLED: z.literal('true').or(z.any()).optional(),
  });
  const ENV = ENVSchema.parse(process.env);

  const {
    SUPER_DATABASE_AUTH_TOKEN,
    SUPER_DATABASE_URL,
    TENANT_DATABASE_AUTH_TOKEN,
    ConfigBucket,
    OtelCollectorLambdaLayer,
    OtelInstrumentationLambdaLayer
  } = use(ExtractStack);

  const otelCollectorConfigFile = `s3://${ConfigBucket.cdk.bucket.bucketName}.s3.eu-central-1.amazonaws.com/otel_collector_config.yaml`

  const OTEL_ENVIRONMENT_PROPS = ENV.OTEL_DISABLED ? {} : {
    OPENTELEMETRY_COLLECTOR_CONFIG_FILE: otelCollectorConfigFile,
    OTEL_RESOURCE_ATTRIBUTES: `deployment.environment=${stack.stage}`,
    AWS_LAMBDA_EXEC_WRAPPER: "/opt/otel-handler",
    OTEL_EXPORTER_OTLP_ENDPOINT:"http://localhost:4318",
  } as Record<string,string>;
  const OTEL_LAMBDA_LAYERS = ENV.OTEL_DISABLED ? [] : [
    OtelCollectorLambdaLayer,
    OtelInstrumentationLambdaLayer
  ]

  const transformQueue = new Queue(stack, "TransformQueue");
  transformQueue.addConsumer(stack, {
    cdk: {
      eventSource: {
        batchSize: 1,
        maxConcurrency: 20,
      },
    },
    function: {
      bind: [
        transformQueue,
        ConfigBucket,
        SUPER_DATABASE_AUTH_TOKEN,
        SUPER_DATABASE_URL,
        TENANT_DATABASE_AUTH_TOKEN,
      ],
      handler: "src/transform/queue.handler",
      environment: {
        OTEL_SERVICE_NAME: "transform-queue-handler",
        ...OTEL_ENVIRONMENT_PROPS,
      },
      layers: [
        ...OTEL_LAMBDA_LAYERS,
      ]
    },

  });

  const api = new Api(stack, "TransformApi", {
    defaults: {
      authorizer: "JwtAuthorizer",
      function: {
        bind: [
          transformQueue,
          SUPER_DATABASE_AUTH_TOKEN,
          SUPER_DATABASE_URL,
        ],
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
      "POST /start": "src/transform/transform-tenant.apiHandler",
    },
  });

  if (ENV.CRON_DISABLED !== 'true') {
    new Cron(stack, "TransformCron", {
      schedule: "cron(0/15 * * * ? *)",
      job: {
        function: {
          handler: "src/transform/transform-tenant.cronHandler",
          bind: [
            transformQueue,
            ConfigBucket,
            SUPER_DATABASE_AUTH_TOKEN,
            SUPER_DATABASE_URL,
          ],
          environment: {
            OTEL_SERVICE_NAME: "transform-cron",
            ...OTEL_ENVIRONMENT_PROPS,
          },
          layers: [
            ...OTEL_LAMBDA_LAYERS,
          ]
        }
      }
    });
  }

  stack.addOutputs({
    ApiEndpoint: api.url,
  });


}

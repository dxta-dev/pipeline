import {
  Api,
  Bucket,
  Config,
  Cron,
  EventBus,
  Queue,
  type StackContext,
} from "sst/constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { z } from "zod";

export function ExtractStack({ stack }: StackContext) {
  const ENVSchema = z.object({
    CLERK_JWT_ISSUER: z.string(),
    CLERK_JWT_AUDIENCE: z.string(),
    CRON_DISABLED: z.literal('true').or(z.any()).optional(),
    DXTA_CONFIGS_BUCKET_ARN: z.string(),
  });
  const ENV = ENVSchema.parse(process.env);  

  const TENANT_DATABASE_AUTH_TOKEN = new Config.Secret(stack, "TENANT_DATABASE_AUTH_TOKEN");
  const SUPER_DATABASE_URL = new Config.Secret(stack, "SUPER_DATABASE_URL");
  const SUPER_DATABASE_AUTH_TOKEN = new Config.Secret(stack, "SUPER_DATABASE_AUTH_TOKEN");
  const CLERK_SECRET_KEY = new Config.Secret(stack, "CLERK_SECRET_KEY");
  const REDIS_URL = new Config.Secret(stack, "REDIS_URL");
  const REDIS_TOKEN = new Config.Secret(stack, "REDIS_TOKEN");
  const REDIS_USER_TOKEN_TTL = new Config.Parameter(stack, "REDIS_USER_TOKEN_TTL", { value: (20 * 60).toString() });
  const PER_PAGE = new Config.Parameter(stack, "PER_PAGE", { value: (30).toString() });
  const FETCH_TIMELINE_EVENTS_PER_PAGE = new Config.Parameter(stack, "FETCH_TIMELINE_EVENTS_PER_PAGE", { value: (1000).toString() });
  const CRON_USER_ID = new Config.Secret(stack, "CRON_USER_ID");
  
  const configBucket = new Bucket(stack, "ConfigBucket", {
    cdk: {
      bucket: s3.Bucket.fromBucketArn(stack, "IConfigBucket", ENV.DXTA_CONFIGS_BUCKET_ARN)
    }
  });

  const otelCollectorLambdaLayer = lambda.LayerVersion.fromLayerVersionArn(stack, "OTELCollectorLayer", "arn:aws:lambda:eu-central-1:184161586896:layer:opentelemetry-collector-amd64-0_6_0:1");
  const otelInstrumentationLambdaLayer = lambda.LayerVersion.fromLayerVersionArn(stack, "OTELInstrumentationLayer", "arn:aws:lambda:eu-central-1:184161586896:layer:opentelemetry-nodejs-0_6_0:1");

  const bus = new EventBus(stack, "ExtractBus", {
    rules: {
      repository: {
        pattern: {
          source: ["extract"],
          detailType: ["repository"],
        },
      },
      githubRepository: {
        pattern: {
          source: ["extract"],
          detailType: ["repository"],
          detail: {
            metadata: {
              sourceControl: ["github"],
            }
          }
        },
      },
      mergeRequests: {
        pattern: {
          source: ["extract"],
          detailType: ["mergeRequest"],
        },
      },
      members: {
        pattern: {
          source: ["extract"],
          detailType: ["members"],
        }
      },
      githubMergeRequests: {
        pattern: {
          source: ["extract"],
          detailType: ["mergeRequest"],
          detail: {
            metadata: {
              sourceControl: ["github"],
            }
          }
        }
      },
    },
    defaults: {
      retries: 10,
      function: {
        bind: [
          TENANT_DATABASE_AUTH_TOKEN,
          SUPER_DATABASE_AUTH_TOKEN,
          SUPER_DATABASE_URL,      
          CLERK_SECRET_KEY,
          REDIS_URL,
          REDIS_TOKEN,
          REDIS_USER_TOKEN_TTL,
          PER_PAGE
        ],
      },
    },
  });

  const extractQueue = new Queue(stack, "ExtractQueue");
  extractQueue.addConsumer(stack, {
    cdk: {
      eventSource: {
        batchSize: 1,
        maxConcurrency: 20,
      },
    },
    function: {
      handler: "src/extract/queue.handler",
      bind: [
        bus,
        configBucket,
        extractQueue,
        TENANT_DATABASE_AUTH_TOKEN,
        SUPER_DATABASE_AUTH_TOKEN,
        SUPER_DATABASE_URL,    
        CLERK_SECRET_KEY,
        REDIS_URL,
        REDIS_TOKEN,
        REDIS_USER_TOKEN_TTL,
        PER_PAGE,
        FETCH_TIMELINE_EVENTS_PER_PAGE
      ],
      environment: {
        OPENTELEMETRY_COLLECTOR_CONFIG_FILE: `s3://${configBucket.cdk.bucket.bucketName}.s3.eu-central-1.amazonaws.com/otel_collector_config.yaml`,
        OTEL_SERVICE_NAME: "extract-queue-handler",
        OTEL_RESOURCE_ATTRIBUTES: `deployment.environment=${stack.stage}`,
        AWS_LAMBDA_EXEC_WRAPPER: "/opt/otel-handler",
        OTEL_EXPORTER_OTLP_ENDPOINT:"http://localhost:4318",
      },
      layers: [
        otelCollectorLambdaLayer,
        otelInstrumentationLambdaLayer
      ]
    },
  });

  bus.addTargets(stack, "members", {
    extractUserInfo: {
      function: {
        bind: [bus, configBucket, extractQueue],
        handler: "src/extract/extract-member-info.eventHandler",
        environment: {
          OPENTELEMETRY_COLLECTOR_CONFIG_FILE: `s3://${configBucket.cdk.bucket.bucketName}.s3.eu-central-1.amazonaws.com/otel_collector_config.yaml`,
          OTEL_SERVICE_NAME: "extract-member-info",
          OTEL_RESOURCE_ATTRIBUTES: `deployment.environment=${stack.stage}`,
          AWS_LAMBDA_EXEC_WRAPPER: "/opt/otel-handler",
          OTEL_EXPORTER_OTLP_ENDPOINT:"http://localhost:4318",
        },
        layers: [
          otelCollectorLambdaLayer,
          otelInstrumentationLambdaLayer
        ]
      },
    },
  });

  bus.addTargets(stack, "repository", {
    extractMember: {
      function: {
        bind: [bus, configBucket, extractQueue],
        handler: "src/extract/extract-members.eventHandler",
        environment: {
          OPENTELEMETRY_COLLECTOR_CONFIG_FILE: `s3://${configBucket.cdk.bucket.bucketName}.s3.eu-central-1.amazonaws.com/otel_collector_config.yaml`,
          OTEL_SERVICE_NAME: "extract-repository-members",
          OTEL_RESOURCE_ATTRIBUTES: `deployment.environment=${stack.stage}`,
          AWS_LAMBDA_EXEC_WRAPPER: "/opt/otel-handler",
          OTEL_EXPORTER_OTLP_ENDPOINT:"http://localhost:4318",
        },
        layers: [
          otelCollectorLambdaLayer,
          otelInstrumentationLambdaLayer
        ]
      },
    },
    extractNamespaceMember: {
      function: {
        bind: [bus, extractQueue, configBucket],
        handler: "src/extract/extract-namespace-members.eventHandler",
        environment: {
          OPENTELEMETRY_COLLECTOR_CONFIG_FILE: `s3://${configBucket.cdk.bucket.bucketName}.s3.eu-central-1.amazonaws.com/otel_collector_config.yaml`,
          OTEL_SERVICE_NAME: "extract-namespace-members",
          OTEL_RESOURCE_ATTRIBUTES: `deployment.environment=${stack.stage}`,
          AWS_LAMBDA_EXEC_WRAPPER: "/opt/otel-handler",
          OTEL_EXPORTER_OTLP_ENDPOINT:"http://localhost:4318",
        },
        layers: [
          otelCollectorLambdaLayer,
          otelInstrumentationLambdaLayer
        ]
      },
    },
    mergeRequests: {
      function: {
        bind: [bus, configBucket, extractQueue],
        handler: "src/extract/extract-merge-requests.eventHandler",
        environment: {
          OPENTELEMETRY_COLLECTOR_CONFIG_FILE: `s3://${configBucket.cdk.bucket.bucketName}.s3.eu-central-1.amazonaws.com/otel_collector_config.yaml`,
          OTEL_SERVICE_NAME: "extract-merge-requests",
          OTEL_RESOURCE_ATTRIBUTES: `deployment.environment=${stack.stage}`,
          AWS_LAMBDA_EXEC_WRAPPER: "/opt/otel-handler",
          OTEL_EXPORTER_OTLP_ENDPOINT:"http://localhost:4318",
        },
        layers: [
          otelCollectorLambdaLayer,
          otelInstrumentationLambdaLayer
        ]
      },
    },
  });

  bus.addTargets(stack, "githubRepository", {
    workflows: {
      function: {
        bind: [bus, extractQueue, configBucket],
        handler: "src/extract/extract-cicd-workflows.eventHandler",
        environment: {
          OPENTELEMETRY_COLLECTOR_CONFIG_FILE: `s3://${configBucket.cdk.bucket.bucketName}.s3.eu-central-1.amazonaws.com/otel_collector_config.yaml`,
          OTEL_SERVICE_NAME: "extract-cicd-workflows",
          OTEL_RESOURCE_ATTRIBUTES: `deployment.environment=${stack.stage}`,
          AWS_LAMBDA_EXEC_WRAPPER: "/opt/otel-handler",
          OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318",
        },
        layers: [
          otelCollectorLambdaLayer,
          otelInstrumentationLambdaLayer
        ]
      }
    },
    cicdRuns: {
      function: {
        bind: [bus, extractQueue, configBucket],
        handler: "src/extract/extract-cicd-runs.eventHandler",
        environment: {
          OPENTELEMETRY_COLLECTOR_CONFIG_FILE: `s3://${configBucket.cdk.bucket.bucketName}.s3.eu-central-1.amazonaws.com/otel_collector_config.yaml`,
          OTEL_SERVICE_NAME: "extract-cicd-runs",
          OTEL_RESOURCE_ATTRIBUTES: `deployment.environment=${stack.stage}`,
          AWS_LAMBDA_EXEC_WRAPPER: "/opt/otel-handler",
          OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318",
        },
        layers: [
          otelCollectorLambdaLayer,
          otelInstrumentationLambdaLayer
        ]
      }
    }
  });

  bus.addTargets(stack, "mergeRequests", {
    extractMergeRequestDiffs: {
      function: {
        bind: [bus, extractQueue, configBucket],
        handler: "src/extract/extract-merge-request-diffs.eventHandler",
        environment: {
          OPENTELEMETRY_COLLECTOR_CONFIG_FILE: `s3://${configBucket.cdk.bucket.bucketName}.s3.eu-central-1.amazonaws.com/otel_collector_config.yaml`,
          OTEL_SERVICE_NAME: "extract-diffs",
          OTEL_RESOURCE_ATTRIBUTES: `deployment.environment=${stack.stage}`,
          AWS_LAMBDA_EXEC_WRAPPER: "/opt/otel-handler",
          OTEL_EXPORTER_OTLP_ENDPOINT:"http://localhost:4318",
        },
        layers: [
          otelCollectorLambdaLayer,
          otelInstrumentationLambdaLayer
        ]
      }
    },
    extractMergeRequestCommits: {
      function: {
        bind: [bus, extractQueue, configBucket],
        handler: "src/extract/extract-merge-request-commits.eventHandler",
        environment: {
          OPENTELEMETRY_COLLECTOR_CONFIG_FILE: `s3://${configBucket.cdk.bucket.bucketName}.s3.eu-central-1.amazonaws.com/otel_collector_config.yaml`,
          OTEL_SERVICE_NAME: "extract-commits",
          OTEL_RESOURCE_ATTRIBUTES: `deployment.environment=${stack.stage}`,
          AWS_LAMBDA_EXEC_WRAPPER: "/opt/otel-handler",
          OTEL_EXPORTER_OTLP_ENDPOINT:"http://localhost:4318",
        },
        layers: [
          otelCollectorLambdaLayer,
          otelInstrumentationLambdaLayer
        ]
      }
    },
    extractMergeRequestNotes: {
      function: {
        bind: [bus, extractQueue, configBucket],
        handler: "src/extract/extract-merge-request-notes.eventHandler",
        environment: {
          OPENTELEMETRY_COLLECTOR_CONFIG_FILE: `s3://${configBucket.cdk.bucket.bucketName}.s3.eu-central-1.amazonaws.com/otel_collector_config.yaml`,
          OTEL_SERVICE_NAME: "extract-notes",
          OTEL_RESOURCE_ATTRIBUTES: `deployment.environment=${stack.stage}`,
          AWS_LAMBDA_EXEC_WRAPPER: "/opt/otel-handler",
          OTEL_EXPORTER_OTLP_ENDPOINT:"http://localhost:4318",
        },
        layers: [
          otelCollectorLambdaLayer,
          otelInstrumentationLambdaLayer
        ]
      }
    },
  });

  bus.addTargets(stack, 'githubMergeRequests', {
    extractTimelineEvents: {
      function: {
        bind: [bus, configBucket, extractQueue, FETCH_TIMELINE_EVENTS_PER_PAGE],
        handler: "src/extract/extract-timeline-events.eventHandler",
        environment: {
          OPENTELEMETRY_COLLECTOR_CONFIG_FILE: `s3://${configBucket.cdk.bucket.bucketName}.s3.eu-central-1.amazonaws.com/otel_collector_config.yaml`,
          OTEL_SERVICE_NAME: "extract-timeline-events",
          OTEL_RESOURCE_ATTRIBUTES: `deployment.environment=${stack.stage}`,
          AWS_LAMBDA_EXEC_WRAPPER: "/opt/otel-handler",
          OTEL_EXPORTER_OTLP_ENDPOINT:"http://localhost:4318",
        },
        layers: [
          otelCollectorLambdaLayer,
          otelInstrumentationLambdaLayer
        ]
      }
    }
  });

  const api = new Api(stack, "ExtractApi", {
    defaults: {
      authorizer: "JwtAuthorizer",
      function: {
        bind: [
          extractQueue,
          TENANT_DATABASE_AUTH_TOKEN,
          SUPER_DATABASE_AUTH_TOKEN,
          SUPER_DATABASE_URL,      
          CLERK_SECRET_KEY,
          REDIS_URL,
          REDIS_TOKEN,
          REDIS_USER_TOKEN_TTL
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
      "POST /start": "src/extract/extract-tenants.apiHandler",
    },
  });
  
  if (ENV.CRON_DISABLED !== 'true') {
    new Cron(stack, "ExtractCron", { 
      schedule: "cron(8/15 * * * ? *)",
      job: {
        function: {
          handler: "src/extract/extract-tenants.cronHandler",
          bind: [
            extractQueue,
            configBucket,
            SUPER_DATABASE_AUTH_TOKEN,
            SUPER_DATABASE_URL,
            CLERK_SECRET_KEY,
            REDIS_URL,
            REDIS_TOKEN,
            REDIS_USER_TOKEN_TTL,  
            CRON_USER_ID
          ],
          environment: {
            OPENTELEMETRY_COLLECTOR_CONFIG_FILE: `s3://${configBucket.cdk.bucket.bucketName}.s3.eu-central-1.amazonaws.com/otel_collector_config.yaml`,
            OTEL_SERVICE_NAME: "extract-cron", 
            OTEL_RESOURCE_ATTRIBUTES: `deployment.environment=${stack.stage}`,
            AWS_LAMBDA_EXEC_WRAPPER: "/opt/otel-handler",
            OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318",
          },
          layers: [
            otelCollectorLambdaLayer,
            otelInstrumentationLambdaLayer
          ]
        }
      }
    })
  }

  stack.addOutputs({
    ApiEndpoint: api.url,
  });

  return {
    ExtractBus: bus,
    ConfigBucket: configBucket,
    OtelCollectorLambdaLayer: otelCollectorLambdaLayer,
    OtelInstrumentationLambdaLayer: otelInstrumentationLambdaLayer,
    TENANT_DATABASE_AUTH_TOKEN,
    SUPER_DATABASE_AUTH_TOKEN,
    SUPER_DATABASE_URL
  };
}

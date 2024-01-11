import {
  Api,
  Config,
  Cron,
  EventBus,
  Queue,
  type StackContext,
} from "sst/constructs";
import { z } from "zod";

export function ExtractStack({ stack }: StackContext) {
  const ENVSchema = z.object({
    CLERK_JWT_ISSUER: z.string(),
    CLERK_JWT_AUDIENCE: z.string(),
    CRON_USER_ID: z.string(),
    CRON_DISABLED: z.literal('true').optional(),
  });
  const ENV = ENVSchema.parse(process.env);

  const TENANT_DATABASE_AUTH_TOKEN = new Config.Secret(stack, "TENANT_DATABASE_AUTH_TOKEN");
  const META_DATABASE_URL = new Config.Secret(stack, "META_DATABASE_URL");
  const META_DATABASE_AUTH_TOKEN = new Config.Secret(stack, "META_DATABASE_AUTH_TOKEN");
  const CLERK_SECRET_KEY = new Config.Secret(stack, "CLERK_SECRET_KEY");
  const REDIS_URL = new Config.Secret(stack, "REDIS_URL");
  const REDIS_TOKEN = new Config.Secret(stack, "REDIS_TOKEN");
  const REDIS_USER_TOKEN_TTL = new Config.Parameter(stack, "REDIS_USER_TOKEN_TTL", { value: (20 * 60).toString() });
  const PER_PAGE = new Config.Parameter(stack, "PER_PAGE", { value: (30).toString() });

  const bus = new EventBus(stack, "ExtractBus", {
    rules: {
      repository: {
        pattern: {
          source: ["extract"],
          detailType: ["repository"],
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
          META_DATABASE_AUTH_TOKEN,
          META_DATABASE_URL,      
          CLERK_SECRET_KEY,
          REDIS_URL,
          REDIS_TOKEN,
          REDIS_USER_TOKEN_TTL,
          PER_PAGE
        ],
        runtime: "nodejs18.x",
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
      bind: [
        bus,
        extractQueue,
        TENANT_DATABASE_AUTH_TOKEN,
        META_DATABASE_AUTH_TOKEN,
        META_DATABASE_URL,    
        CLERK_SECRET_KEY,
        REDIS_URL,
        REDIS_TOKEN,
        REDIS_USER_TOKEN_TTL,
        PER_PAGE
      ],
      handler: "src/extract/queue.handler",
    },
  });

  bus.addTargets(stack, "members", {
    extractUserInfo: {
      function: {
        bind: [bus, extractQueue],
        handler: "src/extract/extract-member-info.eventHandler",
      },
    },
  });

  bus.addTargets(stack, "repository", {
    extractMember: {
      function: {
        bind: [bus, extractQueue],
        handler: "src/extract/extract-members.eventHandler",
      },
    },
    extractNamespaceMember: {
      function: {
        bind: [bus, extractQueue],
        handler: "src/extract/extract-namespace-members.eventHandler",
      },
    },
    mergeRequests: {
      function: {
        bind: [bus, extractQueue],
        handler: "src/extract/extract-merge-requests.eventHandler",
      },
    },
  });

  bus.addTargets(stack, "mergeRequests", {
    extractMergeRequestDiffs: {
      function: {
        bind: [bus, extractQueue],
        handler: "src/extract/extract-merge-request-diffs.eventHandler",
      }
    },
    extractMergeRequestCommits: {
      function: {
        bind: [bus, extractQueue],
        handler: "src/extract/extract-merge-request-commits.eventHandler",
      }
    },
    extractMergeRequestNotes: {
      function: {
        bind: [bus, extractQueue],
        handler: "src/extract/extract-merge-request-notes.eventHandler",
      }
    },
  });

  bus.addTargets(stack, 'githubMergeRequests', {
    extractTimelineEvents: {
      function: {
        bind: [bus, extractQueue],
        handler: "src/extract/extract-timeline-events.eventHandler",
      }
    }
  });

  const api = new Api(stack, "ExtractApi", {
    defaults: {
      authorizer: "JwtAuthorizer",
      function: {
        bind: [
          bus,
          TENANT_DATABASE_AUTH_TOKEN,
          META_DATABASE_AUTH_TOKEN,
          META_DATABASE_URL,      
          CLERK_SECRET_KEY,
          REDIS_URL,
          REDIS_TOKEN,
          REDIS_USER_TOKEN_TTL
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
      "POST /start": "src/extract/extract-repository.handler",
    },
  });
  
  if (ENV.CRON_DISABLED !== 'true') {
    new Cron(stack, "ExtractCron", { 
      schedule: "cron(00 10 * * ? *)",
      job: {
        function: {
          handler: "src/extract/extract-tenants.cronHandler",
          environment: {
            CRON_USER_ID: ENV.CRON_USER_ID,
          },
          bind: [
            extractQueue,
            META_DATABASE_AUTH_TOKEN,
            META_DATABASE_URL,
            CLERK_SECRET_KEY,
            REDIS_URL,
            REDIS_TOKEN,
            REDIS_USER_TOKEN_TTL,  
          ],
          runtime: "nodejs18.x",  
        }
      }
    })
  }

  stack.addOutputs({
    ApiEndpoint: api.url,
  });

  return {
    ExtractBus: bus,
    TENANT_DATABASE_AUTH_TOKEN,
    META_DATABASE_AUTH_TOKEN,
    META_DATABASE_URL
  };
}

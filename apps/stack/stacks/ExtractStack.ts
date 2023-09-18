import {
  Api,
  Config,
  EventBus,
  Queue,
  type StackContext,
} from "sst/constructs";
import { z } from "zod";

export function ExtractStack({ stack }: StackContext) {
  const DATABASE_URL = new Config.Secret(stack, "DATABASE_URL");
  const DATABASE_AUTH_TOKEN = new Config.Secret(stack, "DATABASE_AUTH_TOKEN");
  const CLERK_SECRET_KEY = new Config.Secret(stack, "CLERK_SECRET_KEY");
  const REDIS_URL = new Config.Secret(stack, "REDIS_URL");
  const REDIS_TOKEN = new Config.Secret(stack, "REDIS_TOKEN");
  const REDIS_USER_TOKEN_TTL = new Config.Parameter(stack, "REDIS_USER_TOKEN_TTL", { value: (20 * 60).toString() });

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
      githubMembers: {
        pattern: {
          source: ["extract"],
          detailType: ["members"],
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
        bind: [DATABASE_URL, CLERK_SECRET_KEY, DATABASE_AUTH_TOKEN, REDIS_URL, REDIS_TOKEN, REDIS_USER_TOKEN_TTL],
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
        DATABASE_URL,
        CLERK_SECRET_KEY,
        DATABASE_AUTH_TOKEN,
        REDIS_URL, REDIS_TOKEN, REDIS_USER_TOKEN_TTL
      ],
      handler: "src/queue.handler",
    },
  });

  bus.addTargets(stack, "githubMembers", {
    extractUserInfo: {
      function: {
        bind: [bus, extractQueue],
        handler: "src/extract-member-info.eventHandler",
      },
    },
  });

  bus.addTargets(stack, "repository", {
    extractMember: {
      function: {
        bind: [bus, extractQueue],
        handler: "src/extract-members.eventHandler",
      },
    },
  });

  bus.addTargets(stack, "repository", {
    extractNamespaceMember: {
      function: {
        bind: [bus, extractQueue],
        handler: "src/extract-namespace-members.eventHandler",
      },
    },
  });

  bus.addTargets(stack, "repository", {
    mergeRequests: {
      function: {
        bind: [bus, extractQueue],
        handler: "src/extract-merge-requests.eventHandler",
      },
    },
  });

  bus.addTargets(stack, "mergeRequests", {
    extractMergeRequestDiffs: {
      function: {
        bind: [bus, extractQueue],
        handler: "src/extract-merge-request-diffs.eventHandler",
      }
    }
  });

  bus.addTargets(stack, "mergeRequests", {
    extractMergeRequestCommits: {
      function: {
        bind: [bus, extractQueue],
        handler: "src/extract-merge-request-commits.eventHandler",
      }
    }
  });

  bus.addTargets(stack, "mergeRequests", {
    extractMergeRequestNotes: {
      function: {
        bind: [bus, extractQueue],
        handler: "src/extract-merge-request-notes.eventHandler",
      }
    }
  });

  const ENVSchema = z.object({
    CLERK_JWT_ISSUER: z.string(),
    CLERK_JWT_AUDIENCE: z.string(),
  });

  const ENV = ENVSchema.parse(process.env);

  const api = new Api(stack, "ExtractApi", {
    defaults: {
      authorizer: "JwtAuthorizer",
      function: {
        bind: [bus, DATABASE_URL, DATABASE_AUTH_TOKEN, CLERK_SECRET_KEY, REDIS_URL, REDIS_TOKEN, REDIS_USER_TOKEN_TTL],
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
      "POST /start": "src/extract-repository.handler",
    },
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });

  return {
    ExtractBus: bus,
  };
}

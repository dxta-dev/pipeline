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
    CRON_DISABLED: z.literal('true').or(z.any()).optional(),
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
      githubRepositoryDeployments: {
        pattern: {
          source: ["extract"],
          detailType: ["repository-deployments"],
          detail: {
            metadata: {
              sourceControl: ["github"],
            }
          }
        }
      },
      deployments: {
        pattern: {
          source: ["extract"],
          detailType: ["deployment"],
        }
      }
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
    deploymentStatus: {
      function: {
        bind: [bus, extractQueue],
        handler: "src/extract/extract-deployment-status.onExtractRepository",
      },
    }
  });

  bus.addTargets(stack, "githubRepository", {
    defaultBranchCommits: {
      function: {
        bind: [bus, extractQueue],
        handler: "src/extract/extract-default-branch-commits.eventHandler",
      }
    },
    workflowDeployments: {
      function: {
        bind: [bus, extractQueue],
        handler: "src/extract/extract-workflow-deployments.eventHandler",
      }
    },
    deployments: {
      function: {
        bind: [bus, extractQueue],
        handler: "src/extract/extract-deployments.eventHandler",
      }
    },
    workflowDeploymentStatus: {
      function: {
        bind: [bus, extractQueue],
        handler: "src/extract/extract-workflow-deployment-status.eventHandler",
      },
    }
  });

  bus.addTargets(stack, "githubRepositoryDeployments", {
    extractRepositoryDeployments: {
      function: {
        bind: [bus, extractQueue],
        handler: "src/extract/extract-initial-deployments.eventHandler",
      }
    }
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
        bind: [bus, extractQueue, FETCH_TIMELINE_EVENTS_PER_PAGE],
        handler: "src/extract/extract-timeline-events.eventHandler",
      }
    }
  });

  bus.addTargets(stack, 'deployments', {
    extractDeploymentsStatus: {
      function: {
        bind: [bus, extractQueue],
        handler: "src/extract/extract-deployment-status.onExtractDeployments"
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
      "POST /start-deployments": "src/extract/extract-initial-deployments.apiHandler",
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
            SUPER_DATABASE_AUTH_TOKEN,
            SUPER_DATABASE_URL,
            CLERK_SECRET_KEY,
            REDIS_URL,
            REDIS_TOKEN,
            REDIS_USER_TOKEN_TTL,  
            CRON_USER_ID
          ],
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
    SUPER_DATABASE_AUTH_TOKEN,
    SUPER_DATABASE_URL
  };
}

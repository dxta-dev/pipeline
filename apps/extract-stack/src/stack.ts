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

  const bus = new EventBus(stack, "ExtractBus", {
    rules: {
      extractRepository: {
        pattern: {
          source: ["extract"],
          detailType: ["repository"]
        }
      }
    },
    defaults: {
      retries: 10,
      function: {
        bind: [DATABASE_URL, CLERK_SECRET_KEY, DATABASE_AUTH_TOKEN],
        runtime: 'nodejs18.x'
      }
    },
  });

  const membersQueue = new Queue(stack, "ExtractMemberPageQueue");
  membersQueue.addConsumer(stack, {
    function: {
      bind: [bus, membersQueue, DATABASE_URL, CLERK_SECRET_KEY, DATABASE_AUTH_TOKEN], // Issue: need to bind bus because same file
      handler: 'src/extract-member.queueHandler'
    }
  })

  bus.addTargets(stack, 'extractRepository', {
    'extractMember': {
      function: {
        bind: [bus, membersQueue],
        handler: 'src/extract-member.eventHandler'
      }
    }
  });

  const queue = new Queue(stack, "MRQueue", {
    // consumer: func.handler,
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
        bind: [bus, DATABASE_URL, DATABASE_AUTH_TOKEN, CLERK_SECRET_KEY, queue],
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

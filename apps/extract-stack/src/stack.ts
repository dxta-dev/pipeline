import { Api, EventBus, Queue } from "sst/constructs";
import type { StackContext } from "sst/constructs";
import { Config } from "sst/constructs";
import { z } from "zod";

export function ExtractStack({ stack }: StackContext) {
  const bus = new EventBus(stack, "ExtractBus", {
    defaults: {
      retries: 10,
    },
  });

  const queue = new Queue(stack, "MRQueue", {
    // consumer: func.handler,
  });

  const DATABASE_URL = new Config.Secret(stack, "DATABASE_URL");
  const DATABASE_AUTH_TOKEN = new Config.Secret(stack, "DATABASE_AUTH_TOKEN");
  const GITLAB_TOKEN = new Config.Secret(stack, "GITLAB_TOKEN");
  const CLERK_SECRET_KEY = new Config.Secret(stack, "CLERK_SECRET_KEY");

  const ENVSchema = z.object({ 
    CLERK_JWT_ISSUER: z.string(),
    CLERK_JWT_AUDIENCE: z.string(),
  });

  const ENV = ENVSchema.parse(process.env);

  const api = new Api(stack, "ExtractApi", {
    defaults: {
      authorizer: 'JwtAuthorizer',
      function: {
        bind: [bus, DATABASE_URL, DATABASE_AUTH_TOKEN, GITLAB_TOKEN, CLERK_SECRET_KEY, queue],
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


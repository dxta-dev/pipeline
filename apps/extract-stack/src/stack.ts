import { Api, EventBus } from "sst/constructs";
import type { StackContext } from "sst/constructs";
import { Config } from "sst/constructs";

export function ExtractStack({ stack }: StackContext) {
  const bus = new EventBus(stack, "ExtractBus", {
    defaults: {
      retries: 10,
    },
  });

  const DATABASE_URL = new Config.Secret(stack, "DATABASE_URL");
  const DATABASE_AUTH_TOKEN = new Config.Secret(stack, "DATABASE_AUTH_TOKEN");
  const GITLAB_TOKEN = new Config.Secret(stack, "GITLAB_TOKEN");

  const api = new Api(stack, "ExtractApi", {
    defaults: {
      function: {
        bind: [bus, DATABASE_URL, DATABASE_AUTH_TOKEN, GITLAB_TOKEN],
      },
    },
    routes: {
      "POST /gitlab": "src/extract-repository.handler",
    },
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });

  return {
    ExtractBus: bus,
  };
}


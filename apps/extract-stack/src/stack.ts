import { Api, EventBus } from "sst/constructs";
import type { StackContext } from "sst/constructs";
import { extractRepositoryEvent } from "./events";

export function ExtractStack({ stack }: StackContext) {
  const bus = new EventBus(stack, "ExtractBus", {
    defaults: {
      retries: 10,
    },
    rules: {

    }
  });

  const api = new Api(stack, "ExtractApi", {
    defaults: {
      function: {
        bind: [bus],
      },
    },
    routes: {
      "POST /gitlab": "packages/functions/list.handler",
      "POST /github": "packages/functions/list.handler",
    },
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}


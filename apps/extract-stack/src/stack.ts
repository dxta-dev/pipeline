import { Api, EventBus } from "sst/constructs";
import type { StackContext } from "sst/constructs";

export function ExtractStack({ stack }: StackContext) {
  const bus = new EventBus(stack, "ExtractBus", {
    defaults: {
      retries: 10,
    },
  });

  const api = new Api(stack, "ExtractApi", {
    defaults: {
      function: {
        bind: [bus],
      },
    },
    routes: {
      "POST /gitlab": "extract-repository.handler",
    },
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });

  return {
    ExtractBus: bus,
  };
}


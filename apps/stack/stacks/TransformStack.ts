import {
  use,
  Config,
  type StackContext,
} from "sst/constructs";
import { ExtractStack } from "./ExtractStack";

export function TransformStack({ stack }: StackContext) {

  const { ExtractBus } = use(ExtractStack);
  const TRANSFORM_DATABASE_URL = new Config.Secret(stack, "TRANSFORM_DATABASE_URL");
  const TRANSFORM_DATABASE_AUTH_TOKEN = new Config.Secret(stack, "TRANSFORM_DATABASE_AUTH_TOKEN");

  ExtractBus.addRules(stack, {
    "transformRepository": {
      pattern: {
        source: ["extract"],
        detailType: ["repository"]
      },
      targets: {
        transformRepository: {
          function: {
            bind: [TRANSFORM_DATABASE_URL, TRANSFORM_DATABASE_AUTH_TOKEN],
            handler: "src/transform/transform-repository.eventHandler",
          }
        }
      },
      
    }
  });

  ExtractBus.addRules(stack, {
    "transformMergeRequests": {
      pattern: {
        source: ["extract"],
        detailType: ["mergeRequest"]
      },
      targets: {
        transformMergeRequests: {
          function: {
            bind: [TRANSFORM_DATABASE_URL, TRANSFORM_DATABASE_AUTH_TOKEN],
            handler: "src/transform/transform-merge-requests.eventHandler",
          }
        }
      },
    }
  });

  ExtractBus.addRules(stack, {
    "transformMergeRequestDiffs": {
      pattern: {
        source: ["extract"],
        detailType: ["mergeRequest"]
      },
      targets: {
        transformMergeRequestDiffs: {
          function: {
            bind: [TRANSFORM_DATABASE_URL, TRANSFORM_DATABASE_AUTH_TOKEN],
            handler: "src/transform/transform-merge-request-diffs.eventHandler",
          }
        }
      },
    }
  });

  ExtractBus.addRules(stack, {
    "transformForgeUsers": {
      pattern: {
        source: ["extract"],
        detailType: ["memberInfo"]
      },
      targets: {
        transformForgeUsers: {
          function: {
            bind: [TRANSFORM_DATABASE_URL, TRANSFORM_DATABASE_AUTH_TOKEN],
            handler: "src/transform/transform-forge-users.eventHandler",
          }
        }
      },
    }
  });

}
import type { SSTConfig } from "sst";
import { ExtractStack } from "./stacks/ExtractStack";
import { TransformStack } from "stacks/TransformStack";

export default {
  config(_input) {
    return {
      name: "mr-tool",
      region: "eu-central-1",
    };
  },
  stacks(app) {
    app.stack(ExtractStack);
    app.stack(TransformStack);
  }
} satisfies SSTConfig;

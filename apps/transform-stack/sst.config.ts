import type { SSTConfig } from "sst";
import { TransformStack } from "./src/stack";

export default {
  config(_input) {
    return {
      name: "transform",
      region: "eu-central-1",
    };
  },
  stacks(app) {
    app.stack(TransformStack);
  }
} satisfies SSTConfig;

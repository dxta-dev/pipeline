import type { SSTConfig } from "sst";
import { TransformStack } from "./src/stack";

export default {
  config(_input) {
    return {
      name: "extract",
      region: "eu-central-1",
    };
  },
  stacks(app) {
    app.stack(TransformStack);
  }
} satisfies SSTConfig;

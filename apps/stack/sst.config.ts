import type { SSTConfig } from "sst";
import { ExtractStack } from "./stacks/ExtractStack";

export default {
  config(_input) {
    return {
      name: "extract",
      region: "eu-central-1",
    };
  },
  stacks(app) {
    app.stack(ExtractStack);
  }
} satisfies SSTConfig;

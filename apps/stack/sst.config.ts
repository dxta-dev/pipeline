import type { SSTConfig } from "sst";
import { ExtractStack } from "./stacks/ExtractStack";
import { TransformStack } from "stacks/TransformStack";

export default {
  config(_input) {
    return {
      name: "dxta-pipeline",
      region: "eu-central-1",
    };
  },
  stacks(app) {
    app.setDefaultFunctionProps({
      runtime: 'nodejs18.x',
      nodejs: {
        install: [
          '@libsql/client',
          '@libsql/linux-x64-gnu'
        ]
      }
    });
    app.stack(ExtractStack);
    app.stack(TransformStack);
  }
} satisfies SSTConfig;

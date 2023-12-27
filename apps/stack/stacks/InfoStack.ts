import {
  type StackContext,
  Api,
  use
} from "sst/constructs";
import { ExtractStack } from "./ExtractStack";

export function InfoStack({ stack }: StackContext) {

  const {
    TENANTS,
  } = use(ExtractStack);


  const api = new Api(stack, "InfoApi", {
    defaults: {
      function: {
        bind: [TENANTS]
      }
    },
    routes: {
      "GET /oss-tenants": "src/info/tenants.handler",
    },
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });

};

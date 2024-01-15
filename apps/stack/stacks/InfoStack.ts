import {
  type StackContext,
  Api,
  use
} from "sst/constructs";
import { ExtractStack } from "./ExtractStack";

export function InfoStack({ stack }: StackContext) {

  const {
    SUPER_DATABASE_AUTH_TOKEN,
    SUPER_DATABASE_URL,
  } = use(ExtractStack);


  const api = new Api(stack, "InfoApi", {
    defaults: {
      function: {
        bind: [
          SUPER_DATABASE_AUTH_TOKEN,
          SUPER_DATABASE_URL,
        ]
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

import {
  type StackContext,
  Api,
  use
} from "sst/constructs";
import { ExtractStack } from "./ExtractStack";

export function InfoStack({ stack }: StackContext) {

  const {
    META_DATABASE_AUTH_TOKEN,
    META_DATABASE_URL,
  } = use(ExtractStack);


  const api = new Api(stack, "InfoApi", {
    defaults: {
      function: {
        bind: [
          META_DATABASE_AUTH_TOKEN,
          META_DATABASE_URL,
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

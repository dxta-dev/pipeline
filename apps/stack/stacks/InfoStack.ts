import {
  type StackContext,
  Api
} from "sst/constructs";

export function InfoStack({ stack }: StackContext) {
  const _api = new Api(stack, "InfoApi", {
    routes: {
      "GET /oss-tenants": "src/info/tenants.handler",
    },
  });
};

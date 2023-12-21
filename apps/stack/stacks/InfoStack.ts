import {
  type StackContext,
  Api
} from "sst/constructs";
import { z } from "zod";

export function InfoStack({ stack }: StackContext) {
  const ENVSchema = z.object({
    TENANTS: z.string(),
  });
  const ENV = ENVSchema.parse(process.env);

  const api = new Api(stack, "InfoApi", {
    defaults: {
      function: {
        environment: {
          TENANTS: ENV.TENANTS,
        }
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

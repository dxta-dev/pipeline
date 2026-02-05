import { Client, Connection } from "@temporalio/client";
import { OpenTelemetryWorkflowClientInterceptor } from "@temporalio/interceptors-opentelemetry";

import { getEnv } from "./env";

let cachedClient: Client | null = null;

export async function getClient(): Promise<Client> {
  if (cachedClient) return cachedClient;

  const env = getEnv();

  const connection = await Connection.connect({
    address: env.TEMPORAL_ADDRESS,
  });

  cachedClient = new Client({
    connection,
    namespace: env.TEMPORAL_NAMESPACE,
    interceptors: {
      workflow: [new OpenTelemetryWorkflowClientInterceptor()],
    },
  });

  return cachedClient;
}

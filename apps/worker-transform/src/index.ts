// MUST be first import - before any other imports!
import { initObservability } from "@dxta/observability";

initObservability({
  serviceName: "@dxta/worker-transform",
  serviceVersion: "1.0.0",
});

import { NativeConnection, Worker } from "@temporalio/worker";

import { transformActivities } from "./activities";
import { getEnv } from "./env";

async function run() {
  const env = getEnv();

  const connection = await NativeConnection.connect({
    address: env.TEMPORAL_ADDRESS,
  });

  const worker = await Worker.create({
    connection,
    namespace: env.TEMPORAL_NAMESPACE,
    taskQueue: "transform",
    workflowsPath: require.resolve("@dxta/workflows"),
    activities: transformActivities,
  });

  console.log("Transform worker started, polling task queue: transform");

  await worker.run();
}

run().catch((err) => {
  console.error("Worker failed:", err);
  process.exit(1);
});

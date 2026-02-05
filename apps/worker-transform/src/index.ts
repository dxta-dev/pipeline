// MUST be first import - before any other imports!
import {
  createResource,
  createTraceExporter,
  initObservability,
  logInfo,
} from "@dxta/observability";

initObservability({
  serviceName: "@dxta/worker-transform",
  serviceVersion: "1.0.0",
});

import {
  makeWorkflowExporter,
  OpenTelemetryActivityInboundInterceptor,
} from "@temporalio/interceptors-opentelemetry";
import { NativeConnection, Worker } from "@temporalio/worker";

import { transformActivities } from "./activities";
import { getEnv } from "./env";

async function run() {
  const env = getEnv();

  logInfo("Starting @dxta/worker-transform...");

  const connection = await NativeConnection.connect({
    address: env.TEMPORAL_ADDRESS,
  });

  const worker = await Worker.create({
    connection,
    namespace: env.TEMPORAL_NAMESPACE,
    taskQueue: "transform",
    workflowsPath: require.resolve("@dxta/workflows"),
    activities: transformActivities,
    interceptors: {
      workflowModules: [
        require.resolve("@dxta/workflows/src/otel-interceptors"),
      ],
      activityInbound: [
        (ctx) => new OpenTelemetryActivityInboundInterceptor(ctx),
      ],
    },
    sinks: {
      exporter: makeWorkflowExporter(
        createTraceExporter(env.OTEL_EXPORTER_OTLP_ENDPOINT),
        createResource("@dxta/worker-transform", "1.0.0"),
      ),
    },
  });

  logInfo("@dxta/worker-transform started, polling task queue: transform");

  await worker.run();
}

run().catch((err) => {
  console.error("Worker failed:", err);
  process.exit(1);
});

import { createTraceExporter } from "./exporters";
import {
  initObservability,
  isObservabilityInitialized,
  shutdownObservability,
} from "./init";
import { logInfo } from "./logs";
import {
  initMetrics,
  type JobMetricAttributes,
  recordJobDuration,
  recordJobExecuted,
  recordJobFailed,
  traceJob,
} from "./metrics";
import { createResource } from "./resource";

// Initialize metrics when module loads
initMetrics();

export {
  initObservability,
  shutdownObservability,
  isObservabilityInitialized,
  recordJobExecuted,
  recordJobFailed,
  recordJobDuration,
  traceJob,
  logInfo,
  createResource,
  createTraceExporter,
  type JobMetricAttributes,
};

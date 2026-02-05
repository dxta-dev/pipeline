import {
  initObservability,
  isObservabilityInitialized,
  shutdownObservability,
} from "./init";
import {
  initMetrics,
  type JobMetricAttributes,
  recordJobDuration,
  recordJobExecuted,
  recordJobFailed,
  traceJob,
} from "./metrics";

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
  type JobMetricAttributes,
};

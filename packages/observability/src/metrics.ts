import type { Attributes, Counter, Histogram, Span } from "@opentelemetry/api";
import { metrics, trace } from "@opentelemetry/api";

// Metric names following OTEL conventions
const METRIC_JOBS_EXECUTED = "jobs.executed";
const METRIC_JOBS_FAILED = "jobs.failed";
const METRIC_JOB_DURATION = "job.duration";

let jobsExecutedCounter: Counter | null = null;
let jobsFailedCounter: Counter | null = null;
let jobDurationHistogram: Histogram | null = null;

/**
 * Initialize custom metrics. Called automatically during SDK init.
 */
export function initMetrics(): void {
  const meter = metrics.getMeter("@dxta/observability");

  jobsExecutedCounter = meter.createCounter(METRIC_JOBS_EXECUTED, {
    description: "Total number of jobs executed",
    unit: "1",
  });

  jobsFailedCounter = meter.createCounter(METRIC_JOBS_FAILED, {
    description: "Total number of jobs that failed",
    unit: "1",
  });

  jobDurationHistogram = meter.createHistogram(METRIC_JOB_DURATION, {
    description: "Duration of job execution",
    unit: "ms",
  });
}

export interface JobMetricAttributes extends Attributes {
  /** Type of job (e.g., "extract-merge-request", "transform-repository") */
  job_type: string;
  /** Status of job execution */
  status?: "success" | "failure";
}

/**
 * Record a job execution.
 */
export function recordJobExecuted(attributes: JobMetricAttributes): void {
  jobsExecutedCounter?.add(1, attributes);
}

/**
 * Record a job failure.
 */
export function recordJobFailed(
  attributes: Omit<JobMetricAttributes, "status">,
): void {
  jobsFailedCounter?.add(1, attributes);
  recordJobExecuted({ ...attributes, status: "failure" });
}

/**
 * Record job duration.
 */
export function recordJobDuration(
  durationMs: number,
  attributes: Omit<JobMetricAttributes, "status">,
): void {
  jobDurationHistogram?.record(durationMs, attributes);
}

/**
 * Create a traced span for a job execution.
 * Automatically records metrics on completion.
 */
export async function traceJob<T>(
  jobType: string,
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  const tracer = trace.getTracer("@dxta/observability");
  const spanName = `${jobType}.${operation}`;

  return tracer.startActiveSpan(spanName, async (span: Span) => {
    const startTime = Date.now();

    try {
      const result = await fn();

      // Record success metrics
      recordJobExecuted({ job_type: jobType, status: "success" });
      recordJobDuration(Date.now() - startTime, { job_type: jobType });

      span.setStatus({ code: 1 }); // OK

      return result;
    } catch (error) {
      // Record failure metrics
      recordJobFailed({ job_type: jobType });
      recordJobDuration(Date.now() - startTime, { job_type: jobType });

      span.setStatus({
        code: 2, // ERROR
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error as Error);

      throw error;
    } finally {
      span.end();
    }
  });
}

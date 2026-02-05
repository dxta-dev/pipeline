import {
  OpenTelemetryInboundInterceptor,
  OpenTelemetryInternalsInterceptor,
  OpenTelemetryOutboundInterceptor,
} from "@temporalio/interceptors-opentelemetry/lib/workflow";
import type { WorkflowInterceptorsFactory } from "@temporalio/workflow";

export const interceptors: WorkflowInterceptorsFactory = () => ({
  inbound: [new OpenTelemetryInboundInterceptor()],
  outbound: [new OpenTelemetryOutboundInterceptor()],
  internals: [new OpenTelemetryInternalsInterceptor()],
});

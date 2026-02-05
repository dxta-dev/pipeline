import type { Attributes } from "@opentelemetry/api";
import { logs, SeverityNumber } from "@opentelemetry/api-logs";

let logScopeName: string | null = null;

export function initLogs(scopeName: string): void {
  logScopeName = scopeName;
}

export function logInfo(message: string, attributes?: Attributes): void {
  const logger = logs.getLogger(logScopeName || "@dxta/observability");

  logger.emit({
    body: message,
    severityNumber: SeverityNumber.INFO,
    severityText: "INFO",
    attributes,
  });

  console.info(message);
}

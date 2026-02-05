import { Resource } from "@opentelemetry/resources";
import {
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_INSTANCE_ID,
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

/**
 * Create a Resource with service identification attributes.
 */
export function createResource(
  serviceName: string,
  serviceVersion: string = "1.0.0",
): Resource {
  const instanceId = `${serviceName}-${process.pid}-${Date.now()}`;
  const environment = process.env.NODE_ENV || "development";

  return new Resource({
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
    [SEMRESATTRS_SERVICE_INSTANCE_ID]: instanceId,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment,
  });
}

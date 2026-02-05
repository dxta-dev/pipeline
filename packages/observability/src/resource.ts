import { Resource } from "@opentelemetry/resources";
import {
  ATTR_DEPLOYMENT_ENVIRONMENT,
  ATTR_SERVICE_INSTANCE_ID,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
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
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
    [ATTR_SERVICE_INSTANCE_ID]: instanceId,
    [ATTR_DEPLOYMENT_ENVIRONMENT]: environment,
  });
}

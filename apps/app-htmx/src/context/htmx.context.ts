import type { IncomingHttpHeaders } from "http";

export const htmxContext = (headers: IncomingHttpHeaders) => ({
  htmx: {
    boosted: 'hx-boosted' in headers,
  }
});
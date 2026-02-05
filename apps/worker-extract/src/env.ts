import { z } from "zod";

const envSchema = z.object({
  TEMPORAL_ADDRESS: z.string().default("localhost:7233"),
  TEMPORAL_NAMESPACE: z.string().default("default"),
  TENANT_DATABASE_AUTH_TOKEN: z.string(),
  SUPER_DATABASE_URL: z.string(),
  SUPER_DATABASE_AUTH_TOKEN: z.string(),
  GITHUB_APP_ID: z.string(),
  GITHUB_APP_PRIVATE_KEY: z.string(),
  PER_PAGE: z.coerce.number().default(30),
  FETCH_TIMELINE_EVENTS_PER_PAGE: z.coerce.number().default(1000),
  OTEL_EXPORTER_OTLP_ENDPOINT: z
    .string()
    .default("http://otel.railway.internal:4317"),
  OTEL_LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  cachedEnv = envSchema.parse(process.env);
  return cachedEnv;
}

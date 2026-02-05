import { z } from "zod";

const envSchema = z.object({
  TEMPORAL_ADDRESS: z.string().default("localhost:7233"),
  TEMPORAL_NAMESPACE: z.string().default("default"),
  PORT: z.coerce.number().default(3000),
  EXTRACT_SCHEDULE_ENABLED: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
  TRANSFORM_SCHEDULE_ENABLED: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
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

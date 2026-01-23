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
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  cachedEnv = envSchema.parse(process.env);
  return cachedEnv;
}

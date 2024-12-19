import { z } from "zod";

export const GithubDefaultApiResource = 'core';

const rateLimitStateHeaderSchema = z.object({
  'x-ratelimit-limit': z.coerce.number(),
  'x-ratelimit-remaining': z.coerce.number(),
  'x-ratelimit-reset': z.coerce.number(),
  'x-ratelimit-resource': z.string().optional(),
  'x-ratelimit-used': z.coerce.number(),
}).transform(headers => ({
  limit: headers["x-ratelimit-limit"],
  remaining: headers['x-ratelimit-remaining'],
  resetAt: new Date(headers['x-ratelimit-reset'] * 1000),
  resource: headers['x-ratelimit-resource'] || 'core',
  used: headers['x-ratelimit-used'],
}));

export const headersRateLimitState = (headers: unknown) => {
  const parseResult = rateLimitStateHeaderSchema.safeParse(headers);
  if (!parseResult.success) return null;
  return parseResult.data;
}

export type RateLimitState = z.infer<typeof rateLimitStateHeaderSchema>;
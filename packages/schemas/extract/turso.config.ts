import type { Config } from 'drizzle-kit';
import baseConfig from './drizzle.config';

export default {
  ...baseConfig,
  driver: 'turso',
  dbCredentials: {
    url: process.env.EXTRACT_DATABASE_URL!,
    authToken: process.env.EXTRACT_DATABASE_AUTH_TOKEN,
  }
} satisfies Config;

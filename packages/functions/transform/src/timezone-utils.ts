import * as tenant from '@dxta/tenant-schema';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';

type BrandedDatabase<T> = LibSQLDatabase<Record<string, never>> & { __brand: T }

export type TenantDatabase = BrandedDatabase<'tenant'>;

export async function getLocaleTimezoneOffset(db: TenantDatabase): Promise<number> {
    const result = await db
      .select({ timezoneCode: tenant.tenantConfig.timezoneCode })
      .from(tenant.tenantConfig)
      .limit(1);
  
    const timezone = result?.[0]?.timezoneCode || 'UTC';
  
    const currDate = new Date();
    const options: Intl.DateTimeFormatOptions = { timeZone: timezone };
    const hqTime = new Date(currDate.toLocaleString('en-US', options));
  
    const timezoneOffset = (currDate.getTime() - hqTime.getTime()) / (1000 * 60);
    return Math.round(timezoneOffset); 
  }
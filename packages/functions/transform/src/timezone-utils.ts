import * as tenant from '@dxta/tenant-schema';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';

type BrandedDatabase<T> = LibSQLDatabase<Record<string, never>> & { __brand: T };
export type TenantDatabase = BrandedDatabase<'tenant'>;

export async function getLocaleTimezoneOffset(db: TenantDatabase): Promise<number> {

  const result = await db
    .select({ timezoneCode: tenant.tenantConfig.timezoneCode })
    .from(tenant.tenantConfig)
    .limit(1);

    const timezone = result?.[0]?.timezoneCode || 'UTC';

  const currDate = new Date();

  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const tzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const utcParts = utcFormatter.formatToParts(currDate);

  const tzParts = tzFormatter.formatToParts(currDate);

  const utcDate = new Date(Date.UTC(
    parseInt(utcParts.find(part => part.type === 'year')!.value),
    parseInt(utcParts.find(part => part.type === 'month')!.value) - 1,
    parseInt(utcParts.find(part => part.type === 'day')!.value),
    parseInt(utcParts.find(part => part.type === 'hour')!.value),
    parseInt(utcParts.find(part => part.type === 'minute')!.value),
    parseInt(utcParts.find(part => part.type === 'second')!.value)
  ));

  const tzDate = new Date(Date.UTC(
    parseInt(tzParts.find(part => part.type === 'year')!.value),
    parseInt(tzParts.find(part => part.type === 'month')!.value) - 1,
    parseInt(tzParts.find(part => part.type === 'day')!.value),
    parseInt(tzParts.find(part => part.type === 'hour')!.value),
    parseInt(tzParts.find(part => part.type === 'minute')!.value),
    parseInt(tzParts.find(part => part.type === 'second')!.value)

  ));

  const timezoneOffset = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
  
  return Math.round(timezoneOffset);

}
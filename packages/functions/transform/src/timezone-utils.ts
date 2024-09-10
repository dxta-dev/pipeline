import * as tenant from '@dxta/tenant-schema';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';

type BrandedDatabase<T> = LibSQLDatabase<Record<string, never>> & { __brand: T };
export type TenantDatabase = BrandedDatabase<'tenant'>;

export async function getTimezoneOffset(db: TenantDatabase): Promise<number> {

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

  const utcDate = partsDate(utcParts);
  const tzDate = partsDate(tzParts);

  const timezoneOffset = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
  
  return Math.round(timezoneOffset);
}

function partsDate(parts: Intl.DateTimeFormatPart[]) {
  type DateParts = {
    year?: string;
    month?: string;
    day?: string;
    hour?: string;
  };

  const dateParts = parts.reduce((acc: DateParts, part) => {
    if (part.type === 'year' || part.type === 'month' || part.type === 'day' || part.type === 'hour') {
      acc[part.type] = part.value;
    }
    return acc;
  }, {} as DateParts);

  return new Date(
    Number(dateParts.year),
    Number(dateParts.month) - 1,
    Number(dateParts.day),
    Number(dateParts.hour)
  );
}

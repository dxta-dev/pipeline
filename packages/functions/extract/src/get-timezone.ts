import type { ExtractFunction, Entities } from "./config";
import { sql } from 'drizzle-orm';

export type GetTimezoneInput = {
    timezone: number;
};
  
export type GetTimezoneOutput = {
    timezone: number;
};
  
export type GetTimezoneEntities = Pick<Entities, "tenantConfig">;
  
export type GetTimezoneFunction = ExtractFunction<GetTimezoneInput, GetTimezoneOutput, any, GetTimezoneEntities>;

export const getTimezone: GetTimezoneFunction = async (
    { timezone },
    { db, entities }
  ) => {
  
    return await db.transaction(async (tx) => {
      const result = await tx.insert(entities.tenantConfig).values({ hqTimezone: timezone })
        .onConflictDoUpdate({
          target: [entities.tenantConfig.hqTimezone],
          set: {
            hqTimezone: timezone,
            _updatedAt: sql`(strftime('%s', 'now'))`,
          },
        }).returning()
        .get();
  
      return {
        timezone: result.hqTimezone,
      };
    });
  
  };
  
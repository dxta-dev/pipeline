import type { NewTransformDate } from "../dates";
import type { NewForgeUser } from "../forge-users";
import type { NewMergeRequest } from "../merge-requests";
import type { NewRepository } from "../repositories";
import type { LibSQLDatabase } from "drizzle-orm/libsql"
import type { NewTenantConfig } from "../../../tenant/src/config";
import { forgeUsers } from "../forge-users";
import { dates } from "../dates";
import { mergeRequests } from "../merge-requests";
import { repositories } from "../repositories";
import { nullRows } from "../null-rows";
import { tenantConfig } from "../../../tenant/src/config";
import { type NewBranch, branches } from "../branches";

const nullForgeUser = {
  id: 1,
  externalId: Number.MAX_SAFE_INTEGER,
  forgeType: 'unknown',
  name: '',
  bot: false,
} satisfies NewForgeUser;

const nullDate = {
  id: 1,
  day: Number.MAX_SAFE_INTEGER,
  week: '',
  month: Number.MAX_SAFE_INTEGER,
  year: Number.MAX_SAFE_INTEGER,
} satisfies NewTransformDate;

const nullBranch = {
  id: 1,
  name: '',
} satisfies NewBranch;

const nullMergeRequest = {
  id: 1,
  externalId: Number.MAX_SAFE_INTEGER,
  forgeType: 'unknown',
  title: '',
  webUrl: '',
  sourceBranch: nullBranch.id,
  targetBranch: nullBranch.id,
} satisfies NewMergeRequest;

const nullRepository = {
  id: 1,
  externalId: Number.MAX_SAFE_INTEGER,
  forgeType: 'unknown',
  name: '',
} satisfies NewRepository;

const timezone = {
  id: 1,
  timezoneCode: 'UTC',
} satisfies NewTenantConfig;

export async function seed(db: LibSQLDatabase, startDate: Date, endDate: Date) {
  await db.insert(forgeUsers).values(nullForgeUser).onConflictDoNothing().returning().get();
  await db.insert(dates).values(nullDate).onConflictDoNothing().returning().get();
  await db.insert(branches).values(nullBranch).onConflictDoNothing().returning().get();
  await db.insert(mergeRequests).values(nullMergeRequest).onConflictDoNothing().returning().get();
  await db.insert(repositories).values(nullRepository).onConflictDoNothing().returning().get();
  await db.insert(dates).values(generateDates(startDate, endDate)).onConflictDoNothing().run();
  await db.insert(tenantConfig).values(timezone).onConflictDoNothing().run();

  await db.insert(nullRows).values({
    userId: nullForgeUser.id,
    dateId: nullDate.id,
    mergeRequestId: nullMergeRequest.id,
    repositoryId: nullRepository.id,
    branchId: nullBranch.id,
  }).onConflictDoNothing().returning().get();  
}

export function getFirstDay(year: number): Date {
  let firstDayOfYear = new Date(Date.UTC(year, 0, 1));
  if (firstDayOfYear.getUTCDay() !== 1) {
    for (let i = 1; i < 4; i++) {
      const p = new Date(firstDayOfYear);
      const n = new Date(firstDayOfYear);
      p.setUTCDate(p.getUTCDate() - i);
      n.setUTCDate(n.getUTCDate() + i);
      if (p.getUTCDay() === 1) {
        firstDayOfYear = p;
        break;
      } else if (n.getUTCDay() === 1) {
        firstDayOfYear = n;
        break;
      }
    }
  }
  return firstDayOfYear;
}

export function checkWeek(week: number, year: number): { newWeek: string } {
  let isoWeek = week;
  let isoYear = year;
  if (week < 1) {
    const lastDayOfPrev = new Date(Date.UTC(year - 1, 11, 31));
    const firstDayOfPrev = getFirstDay(year - 1);
    isoWeek = Math.ceil(((lastDayOfPrev.getTime() - firstDayOfPrev.getTime()) / (24 * 60 * 60 * 1000) + 1) / 7)
    isoYear = isoYear - 1
  }
  return { newWeek: `${isoYear}-W${isoWeek.toString().padStart(2, '0')}` };
}

export function getDateInfo(date: Date): {day: number, week: string, month: number, year: number} {
 
  const firstDay = getFirstDay(date.getUTCFullYear());
  const week = Math.ceil(((date.getTime() - firstDay.getTime()) / (24 * 60 * 60 * 1000) + 1) / 7);
  const { newWeek } = checkWeek(week, date.getUTCFullYear());
  return {
    day: date.getUTCDate(),
    week: newWeek,
    month: date.getUTCMonth() + 1, // Months are zero-based, so we add 1.
    year: date.getUTCFullYear(),
 }
}

function generateDates(startDate: Date, endDate: Date) {
  const dates = [];
  const currentDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getDate()));

  while (currentDate <= endDate) {

    const customDate = getDateInfo(currentDate);

    dates.push(customDate);
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return dates;
}

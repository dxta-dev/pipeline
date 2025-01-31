import type { LibSQLDatabase } from "drizzle-orm/libsql";

import { tenantConfig, type NewTenantConfig } from "../../../tenant/src/config";
import { branches, type NewBranch } from "../branches";
import { dates, type NewTransformDate } from "../dates";
import { forgeUsers, type NewForgeUser } from "../forge-users";
import { mergeRequests, type NewMergeRequest } from "../merge-requests";
import { nullRows } from "../null-rows";
import { repositories, type NewRepository } from "../repositories";

const nullForgeUser = {
  id: 1,
  externalId: Number.MAX_SAFE_INTEGER,
  forgeType: "unknown",
  name: "",
  bot: false,
} satisfies NewForgeUser;

const nullDate = {
  id: 1,
  day: Number.MAX_SAFE_INTEGER,
  week: "",
  month: Number.MAX_SAFE_INTEGER,
  year: Number.MAX_SAFE_INTEGER,
} satisfies NewTransformDate;

const nullBranch = {
  id: 1,
  name: "",
} satisfies NewBranch;

const nullMergeRequest = {
  id: 1,
  externalId: Number.MAX_SAFE_INTEGER,
  forgeType: "unknown",
  title: "",
  webUrl: "",
  sourceBranch: nullBranch.id,
  targetBranch: nullBranch.id,
} satisfies NewMergeRequest;

const nullRepository = {
  id: 1,
  externalId: Number.MAX_SAFE_INTEGER,
  forgeType: "unknown",
  name: "",
} satisfies NewRepository;

const timezone = {
  id: 1,
  tzdata: "UTC",
} satisfies NewTenantConfig;

export async function seed(db: LibSQLDatabase, startDate: Date, endDate: Date) {
  await db
    .insert(forgeUsers)
    .values(nullForgeUser)
    .onConflictDoNothing()
    .returning()
    .get();
  await db
    .insert(dates)
    .values(nullDate)
    .onConflictDoNothing()
    .returning()
    .get();
  await db
    .insert(branches)
    .values(nullBranch)
    .onConflictDoNothing()
    .returning()
    .get();
  await db
    .insert(mergeRequests)
    .values(nullMergeRequest)
    .onConflictDoNothing()
    .returning()
    .get();
  await db
    .insert(repositories)
    .values(nullRepository)
    .onConflictDoNothing()
    .returning()
    .get();
  await db
    .insert(dates)
    .values(generateDates(startDate, endDate))
    .onConflictDoNothing()
    .run();
  await db.insert(tenantConfig).values(timezone).onConflictDoNothing().run();

  await db
    .insert(nullRows)
    .values({
      userId: nullForgeUser.id,
      dateId: nullDate.id,
      mergeRequestId: nullMergeRequest.id,
      repositoryId: nullRepository.id,
      branchId: nullBranch.id,
    })
    .onConflictDoNothing()
    .returning()
    .get();
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

function getLeapYear(year: number) {
  if (year % 4 === 0) {
    if (year % 100 === 0) {
      if (year % 400 === 0) {
        return true;
      }
      return false;
    }
    return true;
  }
  return false;
}

function startsOnThursday(year: number) {
  const firstDay = new Date(year, 0, 1).getDay();
  return firstDay === 4;
}

function startsOnWednesday(year: number) {
  const firstDay = new Date(year, 0, 1).getDay();
  return firstDay === 3;
}

function shouldBeWeekOne(year: number) {
  const january4 = new Date(year + 1, 0, 4, 0, 0).getDay();
  const isInWeekWithJan4 = january4 !== 1 && january4 !== 2;
  return isInWeekWithJan4;
}

export function checkWeek(week: number, year: number): { newWeek: string } {
  let isoWeek = week;
  let isoYear = year;
  if (week < 1) {
    const lastDayOfPrev = new Date(Date.UTC(year - 1, 11, 31));
    const firstDayOfPrev = getFirstDay(year - 1);
    isoWeek = Math.ceil(
      ((lastDayOfPrev.getTime() - firstDayOfPrev.getTime()) /
        (24 * 60 * 60 * 1000) +
        1) /
        7,
    );
    isoYear = isoYear - 1;
  }
  if (week === 53) {
    /**
     * An ISO week-numbering year (also called ISO year informally) has 52 or 53 full weeks.
     * That is 364 or 371 days instead of the usual 365 or 366 days.
     * These 53-week years occur on all years that have Thursday as 1 January and on leap years that start on Wednesday.
     * The extra week is sometimes referred to as a leap week, although ISO 8601 does not use this term.
     */
    const isLeapYear = getLeapYear(year);
    if ((!isLeapYear || !startsOnWednesday(year)) && !startsOnThursday(year)) {
      isoWeek = 52;
    }
    if (shouldBeWeekOne(year)) {
      isoWeek = 1;
      isoYear = year + 1;
    }
  }
  return { newWeek: `${isoYear}-W${isoWeek.toString().padStart(2, "0")}` };
}

export function getDateInfo(date: Date): {
  day: number;
  week: string;
  month: number;
  year: number;
} {
  const firstDay = getFirstDay(date.getUTCFullYear());
  const week = Math.ceil(
    ((date.getTime() - firstDay.getTime()) / (24 * 60 * 60 * 1000) + 1) / 7,
  );

  const { newWeek } = checkWeek(week, date.getUTCFullYear());
  return {
    day: date.getUTCDate(),
    week: newWeek,
    month: date.getUTCMonth() + 1, // Months are zero-based, so we add 1.
    year: date.getUTCFullYear(),
  };
}

function generateDates(startDate: Date, endDate: Date) {
  const dates = [];
  const currentDate = new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getDate(),
    ),
  );

  while (currentDate <= endDate) {
    const customDate = getDateInfo(currentDate);

    dates.push(customDate);
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return dates;
}

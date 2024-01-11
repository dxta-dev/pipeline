import type { NewTransformDate } from "../dates";
import type { NewForgeUser } from "../forge-users";
import type { NewMergeRequest } from "../merge-requests";
import type { NewRepository } from "../repositories";
import type { LibSQLDatabase } from "drizzle-orm/libsql"
import { forgeUsers } from "../forge-users";
import { dates } from "../dates";
import { mergeRequests } from "../merge-requests";
import { repositories } from "../repositories";
import { nullRows } from "../null-rows";

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
  week: Number.MAX_SAFE_INTEGER,
  month: Number.MAX_SAFE_INTEGER,
  year: Number.MAX_SAFE_INTEGER,
} satisfies NewTransformDate;

const nullMergeRequest = {
  id: 1,
  externalId: Number.MAX_SAFE_INTEGER,
  forgeType: 'unknown',
  title: '',
  webUrl: '',
} satisfies NewMergeRequest;

const nullRepository = {
  id: 1,
  externalId: Number.MAX_SAFE_INTEGER,
  forgeType: 'unknown',
  name: '',
} satisfies NewRepository;

export async function seed(db: LibSQLDatabase, startDate: Date, endDate: Date): Promise<undefined> {
  const insertedNullForgeUser = await db.insert(forgeUsers).values(nullForgeUser).onConflictDoNothing().returning().get();
  const insertedNullDate = await db.insert(dates).values(nullDate).onConflictDoNothing().returning().get();
  const insertedNullMergeRequest = await db.insert(mergeRequests).values(nullMergeRequest).onConflictDoNothing().returning().get();
  const insertedNullRepo = await db.insert(repositories).values(nullRepository).onConflictDoNothing().returning().get();
  await db.insert(dates).values(generateDates(startDate, endDate)).onConflictDoNothing().run();
  
  // TODO: ???
  if (!insertedNullForgeUser || !insertedNullDate || !insertedNullMergeRequest || !insertedNullRepo) return undefined;

  console.log('nullRows', insertedNullForgeUser.id, insertedNullDate.id, insertedNullMergeRequest.id, insertedNullRepo.id);
  await db.insert(nullRows).values({
    userId: insertedNullForgeUser.id,
    dateId: insertedNullDate.id,
    mergeRequestId: insertedNullMergeRequest.id,
    repositoryId: insertedNullRepo.id,
  }).onConflictDoNothing().run();
  return undefined;

}

function getFirstDay(year: number): Date {
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

function checkWeek(week: number, year: number): {newWeek: number, newYear: number} {
  let testWeek = week;
  let testYear = year;
  if (week < 1) {
    const lastDayOfPrev = new Date(Date.UTC(year - 1, 11, 31));
    const firstDayOfPrev = getFirstDay(year - 1);
    testWeek = Math.ceil(((lastDayOfPrev.getTime() - firstDayOfPrev.getTime()) / (24 * 60 * 60 * 1000) + 1) / 7)
    testYear = testYear - 1
  }
  return { newWeek: testWeek, newYear: testYear};
}

function getDateInfo(date: Date): {day: number, week: number, month: number, year: number} {
 
  const firstDay = getFirstDay(date.getUTCFullYear());
  const week = Math.ceil(((date.getTime() - firstDay.getTime()) / (24 * 60 * 60 * 1000) + 1) / 7);
  const { newWeek, newYear } = checkWeek(week, date.getUTCFullYear());
  console.log(week, newWeek, newYear, date);
  return {
    day: date.getUTCDate(),
    week: newWeek,
    month: date.getUTCMonth() + 1, // Months are zero-based, so we add 1.
    year: newYear,
 }
}

function generateDates(startDate: Date, endDate: Date) {
  const dates = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {

    const customDate = getDateInfo(currentDate);

    dates.push(customDate);
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return dates;
}

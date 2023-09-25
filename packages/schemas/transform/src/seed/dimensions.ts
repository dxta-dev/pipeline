import type { NewTransformDate } from "../dates";
import type { NewForgeUser } from "../forge-users";
import type { NewMergeRequest } from "../merge-requests";
import type { NewRepository } from "../repositories";
import type { LibSQLDatabase } from "drizzle-orm/libsql"
import { forgeUsers } from "../forge-users";
import { dates } from "../dates";
import { mergeRequests } from "../merge-requests";
import { repositories } from "../repositories";

const nullForgeUser = {
  id: 1,
  externalId: Number.MAX_SAFE_INTEGER,
  forgeType: 'unknown',
  name: '',
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

export async function seed (db: LibSQLDatabase, startDate: Date, endDate: Date) {
  await db.insert(forgeUsers).values(nullForgeUser).run();
  await db.insert(dates).values(nullDate).run();
  await db.insert(mergeRequests).values(nullMergeRequest).run();
  await db.insert(repositories).values(nullRepository).run();
  await db.insert(dates).values(generateDates(startDate, endDate)).run();
}

function generateDates(startDate: Date, endDate: Date) {
  const dates = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const customDate = {
      day: currentDate.getUTCDate(),
      week: Math.ceil(((+currentDate - +new Date(currentDate.getUTCFullYear(), 0, 1)) / (24 * 60 * 60 * 1000)) / 7),
      month: currentDate.getUTCMonth() + 1, // Months are zero-based, so we add 1.
      year: currentDate.getUTCFullYear(),
    };

    dates.push(customDate);
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    console.log(currentDate)
  }
  
  return dates;
}

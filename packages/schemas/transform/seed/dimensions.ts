import type { NewTransformDate } from "../src/dates";
import type { NewForgeUser } from "../src/forge-users";
import type { NewMergeRequest } from "../src/merge-requests";
import type { NewRepository } from "../src/repositories";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql"
import { forgeUsers } from "../src/forge-users";
import { dates } from "../src/dates";
import { mergeRequests } from "../src/merge-requests";
import { repositories } from "../src/repositories";
import { createClient } from "@libsql/client";



const db = drizzle(createClient({
  url: process.env.TRANSFORM_DATABASE_URL as string,
  authToken: process.env.TRANSFORM_DATABASE_AUTH_TOKEN
}))

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
  year: Number.MAX_SAFE_INTEGER
} satisfies NewTransformDate;

const nullMergeRequest = {
  id: 1,
  externalId: Number.MAX_SAFE_INTEGER,
  forgeType: 'unknown',
  title: ''
} satisfies NewMergeRequest;

const nullRepository = {
  id: 1,
  externalId: Number.MAX_SAFE_INTEGER,
  forgeType: 'unknown',
  name: ''
} satisfies NewRepository;

async function seed (db: LibSQLDatabase) {
  await db.insert(forgeUsers).values(nullForgeUser).run();
  await db.insert(dates).values(nullDate).run();
  await db.insert(mergeRequests).values(nullMergeRequest).run();
  await db.insert(repositories).values(nullRepository).run();
  await db.insert(dates).values(allDatesWithProperties).run();
}

function generateDates(startDate: Date, endDate: Date) {
  const dates = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const customDate = {
      day: currentDate.getDate(),
      week: Math.ceil(((+currentDate - +new Date(currentDate.getFullYear(), 0, 1)) / (24 * 60 * 60 * 1000)) / 7),
      month: currentDate.getMonth() + 1, // Months are zero-based, so we add 1.
      year: currentDate.getFullYear(),
    };

    dates.push(customDate);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

// Example usage:
const startDate = new Date('2022-09-07');
const endDate = new Date('2023-09-20');
const allDatesWithProperties = generateDates(startDate, endDate);
await seed(db)

console.log(allDatesWithProperties);
import fs from "fs";
import { describe, expect, test } from "@jest/globals";
import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

import { dates } from "../dates";
import { forgeUsers } from "../forge-users";
import { mergeRequests } from "../merge-requests";
import { repositories } from "../repositories";
import { getDateInfo, getFirstDay, seed } from "./dimensions";

let db: LibSQLDatabase;
let sqlite: ReturnType<typeof createClient>;

const testStartDate = new Date("1995-10-18");
const testEndDate = new Date("1996-01-01");

const testSeedDays =
  (testEndDate.getTime() - testStartDate.getTime()) / (24 * 60 * 60 * 1000) + 1;

const dbName = "dimensions";

beforeAll(async () => {
  sqlite = createClient({
    url: `file:${dbName}`,
  });
  db = drizzle(sqlite);
  await migrate(db, { migrationsFolder: "../../../migrations/combined" });
});

afterAll(() => {
  sqlite.close();
  fs.unlinkSync(dbName);
});

describe("dimensions", () => {
  describe("seed", () => {
    test("should insert values into db", async () => {
      await seed(db, testStartDate, testEndDate);
      const seededUsers = await db.select().from(forgeUsers).all();
      expect(seededUsers).toBeDefined();
      expect(seededUsers).toHaveLength(1);
      expect(seededUsers[0]).toEqual(
        expect.objectContaining({
          id: 1,
          forgeType: "unknown",
        }),
      );

      const seededDates = await db.select().from(dates).all();
      expect(seededDates).toBeDefined();
      expect(seededDates).toHaveLength(testSeedDays + 1);

      const seedMergeRequests = await db.select().from(mergeRequests).all();
      expect(seedMergeRequests).toBeDefined();
      expect(seedMergeRequests).toHaveLength(1);
      expect(seedMergeRequests[0]).toEqual(
        expect.objectContaining({
          id: 1,
          forgeType: "unknown",
        }),
      );

      const seedRepositories = await db.select().from(repositories).all();
      expect(seedRepositories).toBeDefined();
      expect(seedRepositories).toHaveLength(1);
      expect(seedRepositories[0]).toEqual(
        expect.objectContaining({
          id: 1,
          forgeType: "unknown",
        }),
      );
    });
  });
  describe("getFirstDay", () => {
    test("should return first day of iso year", () => {
      const year1980 = getFirstDay(1980);
      const year1981 = getFirstDay(1981);
      const year2015 = getFirstDay(2015);
      const year2022 = getFirstDay(2022);
      expect(year1980).toEqual(new Date("1979-12-31"));
      expect(year1981).toEqual(new Date("1980-12-29"));
      expect(year2015).toEqual(new Date("2014-12-29"));
      expect(year2022).toEqual(new Date("2022-01-03"));
    });
  });
  describe("getDateInfo", () => {
    test("should return correct data for given date", () => {
      const date1 = getDateInfo(new Date(Date.UTC(2021, 0, 4)));
      const date2 = getDateInfo(new Date(Date.UTC(2021, 0, 3)));
      const date3 = getDateInfo(new Date(Date.UTC(2023, 0, 4)));
      const date4 = getDateInfo(new Date(Date.UTC(2023, 0, 3)));
      const date5 = getDateInfo(new Date(Date.UTC(2024, 11, 29)));
      const date6 = getDateInfo(new Date(Date.UTC(2024, 11, 30)));
      const date7 = getDateInfo(new Date(Date.UTC(2024, 11, 31)));
      const date8 = getDateInfo(new Date(Date.UTC(2025, 0, 1)));
      const date9 = getDateInfo(new Date(Date.UTC(2025, 11, 29)));
      const date10 = getDateInfo(new Date(Date.UTC(2026, 11, 31)));
      const date11 = getDateInfo(new Date(Date.UTC(2027, 0, 4)));
      expect(date1).toEqual({
        day: 4,
        week: "2021-W01",
        month: 1,
        year: 2021,
      });
      expect(date2).toEqual({
        day: 3,
        week: "2020-W53",
        month: 1,
        year: 2021,
      });
      expect(date3).toEqual({
        day: 4,
        week: "2023-W01",
        month: 1,
        year: 2023,
      });
      expect(date4).toEqual({
        day: 3,
        week: "2023-W01",
        month: 1,
        year: 2023,
      });
      expect(date5).toEqual({
        day: 29,
        week: "2024-W52",
        month: 12,
        year: 2024,
      });
      expect(date6).toEqual({
        day: 30,
        week: "2025-W01",
        month: 12,
        year: 2024,
      });
      expect(date7).toEqual({
        day: 31,
        week: "2025-W01",
        month: 12,
        year: 2024,
      });
      expect(date8).toEqual({
        day: 1,
        week: "2025-W01",
        month: 1,
        year: 2025,
      });
      expect(date9).toEqual({
        day: 29,
        week: "2026-W01",
        month: 12,
        year: 2025,
      });
      expect(date10).toEqual({
        day: 31,
        week: "2026-W53",
        month: 12,
        year: 2026,
      });
      expect(date11).toEqual({
        day: 4,
        week: "2027-W01",
        month: 1,
        year: 2027,
      });
    });
  });
});

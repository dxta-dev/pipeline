import { describe, expect, test } from "@jest/globals";
import { getDMY } from "./merge-request-metrics";

describe("getDMY", () => {
  test("should return dmy for date", () => {
    const date = new Date("2021-01-01T00:00:00Z");
    const timezone = "UTC";
    const dmy = getDMY(date, timezone);
    expect(dmy).toBeDefined();
    expect(dmy?.year).toBe(2021);
    expect(dmy?.month).toBe(1);
    expect(dmy?.day).toBe(1);
  });

  test("should return corrected dmy for date with timezone offset for Europe/London", () => {
    const date = new Date("2021-06-30T23:00:00Z");
    const timezone = "Europe/London";
    const dmy = getDMY(date, timezone);
    expect(dmy).toBeDefined();
    expect(dmy?.year).toBe(2021);
    expect(dmy?.month).toBe(7);
    expect(dmy?.day).toBe(1);
  });
});

import { createClient, type Row } from "@libsql/client";

import { getDateInfo } from "./dimensions";

export const startToFix = async () => {
  const db = createClient({
    url: process.env.TENANT_DATABASE_URL!,
    authToken: process.env.TENANT_DATABASE_AUTH_TOKEN,
  });

  const dates = await db.execute(
    "SELECT * FROM transform_dates WHERE week LIKE '%-W53'",
  );

  const rows = dates.rows;

  const updateQueries: string[] = [];

  rows.forEach((row: Row) => {
    const { year, month, day, id, week } = row;
    const transformedDate = getDateInfo(
      new Date(Number(year), Number(month) - 1, Number(day)),
    );

    if (week !== transformedDate.week) {
      updateQueries.push(
        `UPDATE transform_dates SET week = '${transformedDate.week}' WHERE id = ${id}`,
      );
    }
  });

  const result = await db.batch(updateQueries, "deferred");

  return result;
};

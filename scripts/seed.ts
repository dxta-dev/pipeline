#!/usr/bin/env bun
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { seed } from "../packages/schemas/transform/src/seed/dimensions";

if (!process.env.TRANSFORM_DATABASE_URL) {
  console.log("TRANSFORM_DATABASE_URL environment variable is required");
  process.exit(1);
}

if (!process.env.TRANSFORM_DATABASE_AUTH_TOKEN) {
  console.log("TRANSFORM_DATABASE_AUTH_TOKEN environment variable is required");
  process.exit(1);
}

const now = new Date();
const MONTH = 30 * 24 * 60 * 60 * 1000;
seed(
  drizzle(
    createClient({ url: process.env.TRANSFORM_DATABASE_URL, authToken: process.env.TRANSFORM_DATABASE_AUTH_TOKEN })
  ),
  new Date(now.getTime() - 6 * MONTH),
  new Date(now.getTime() + 6 * MONTH)
).catch(console.error);
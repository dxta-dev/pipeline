#!/usr/bin/env node
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const [nodePath, fileName, dbUrl, dbToken] = process.argv;

const exit = (/**@type {string}*/message) => { console.error(message); process.exit(-1); }
const usageText = "usage: ./scripts/migrate.mjs <db_url> <db_token>";
const errorMissingRequiredArgumentText = (/**@type {string}*/arg) => [`error: missing required argument: <${arg}>`, usageText].join("\n");

if (!dbUrl) throw exit(errorMissingRequiredArgumentText('db_url'));
if (!dbToken) throw exit(errorMissingRequiredArgumentText('db_token'));

const libsqlClient = createClient({ url: dbUrl, authToken: dbToken });
const db = drizzle(libsqlClient);
migrate(db, { migrationsFolder: '../../../migrations/extract' }).catch(console.error);

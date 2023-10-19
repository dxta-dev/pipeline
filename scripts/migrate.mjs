#!/usr/bin/env node
import dotenv from "dotenv";
dotenv.config();
import { createClient } from "@libsql/client";
/**@typedef {import("@libsql/client").Client} LibSQLClient*/
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import fs from "fs";

if (process.env.NODE_ENV === 'production') {
  console.error("Ummmmmmm... what are you doing ?!")
  process.exit(-1);
}

const [command] = process.argv.slice(2);

const fingersCrossedMode = command === 'fingers-crossed';
const yoloMode = command === 'yolo';
const noMigrationMode = !fingersCrossedMode && !yoloMode;

/**
 * @typedef MigrationState
 * @property {string[]} files
 */

const selectTablesFromDatabase = async (/**@type {LibSQLClient}*/client) => {
  const resultSet = await client.execute("SELECT name FROM sqlite_schema WHERE type in ('table')");
  const allTableNames = resultSet.rows.map(row => /**@type {string}*/(row.name));

  const shouldIgnoreTable = (/**@type {string}*/tableName) =>
    tableName.startsWith("libsql_") ||
    tableName.startsWith("_") && tableName !== "__drizzle_migrations"
    ;

  const ignoredTablesNames = allTableNames.filter(shouldIgnoreTable);
  console.log(`Keeping tables: \x1b[33m${ignoredTablesNames.join(", ")}\x1b[0m`);

  return allTableNames.filter(name => !shouldIgnoreTable(name));
}

const dropAllDatabaseTables = async (/**@type {LibSQLClient}*/client) => {
  const tableNames = await selectTablesFromDatabase(client);
  if (tableNames.length === 1) return console.log('No tables to drop...');
  for (const tableName of tableNames) {
    try {
      console.warn('Dropping table:\x1b[31m', tableName, '\x1b[0m...');
      await client.execute(`drop table '${tableName}'`);
    } catch (error) {
      console.error('FAILED TO DROP TABLE');
      throw error;
    }
  }
}
const upstreamMigrationStatePath = (/**@type {string}*/databaseId) => `scripts/out/${databaseId}-migrations.upstream-ref.json`;
const upstreamMigrationStateExists = (/**@type {string}*/databaseId) => fs.existsSync(upstreamMigrationStatePath(databaseId));
const readUpstreamMigrationState = (/**@type {string}*/databaseId) => upstreamMigrationStateExists(databaseId) ? /**@type {MigrationState}*/(JSON.parse(fs.readFileSync(upstreamMigrationStatePath(databaseId), { encoding: 'utf8' }))) : undefined;
const writeUpstreamMigrationState = (/**@type {string}*/databaseId, /**@type {string[]}*/files) => fs.writeFileSync(upstreamMigrationStatePath(databaseId), JSON.stringify({ files }));
const hasMigrationStateDesynced = (/**@type {MigrationState}*/migrationState, /**@type {string[]}*/files) => !!migrationState.files.find((file, index) => files.indexOf(file) !== index);
const isMigrationStateEqual = (/**@type {MigrationState}*/migrationState, /**@type {string[]}*/files) => !files.find((file, index) => migrationState.files.indexOf(file) !== index);

const maybeOutDirAlreadyExistsMaybeNot = () => fs.existsSync('scripts/out') || fs.mkdirSync('scripts/out');

/**
 * @param {string} databaseId 
 * @param {string} [dbUrl] 
 * @param {string} [dbToken] 
 */
const tryMigrateDatabase = async (databaseId, dbUrl, dbToken) => {
  console.log(`Migrating db '${databaseId}' ...`);

  const localMigrationFiles = fs.readdirSync(`migrations/${databaseId}`).filter(file => file !== 'meta').sort();
  if (localMigrationFiles.length === 0) return console.warn(`Skipping migration for db '${databaseId}'. Reason: No migration files found :o`);

  const upstreamMigrations = readUpstreamMigrationState(databaseId);
  if (!upstreamMigrations && noMigrationMode) return console.error(`Migration upstream state not found, need to specify migration mode.\n\nUsage: ./scripts/migrate.ts <fingers-crossed|yolo>.\n  fingers-crossed  will try to run the migration without syncing with upstream.\n  yolo             will try to delete all tables in database before migrating.`);
  if (upstreamMigrations && isMigrationStateEqual(upstreamMigrations, localMigrationFiles)) return console.warn(`Skipping migration for db '${databaseId}'. Reason: Upstream migrations are in sync.`);
  if (!dbUrl) return console.warn(`Skipping migration for db '${databaseId}'. Reason: Environment variable ${databaseId.toUpperCase()}_DB_URL is not defined :(`);
  if (!dbToken) return console.warn(`Skipping migration for db '${databaseId}'. Reason: Environment variable ${databaseId.toUpperCase()}_DB_TOKEN is not defined :(`);

  const client = createClient({ url: dbUrl, authToken: dbToken });
  const db = drizzle(client);

  if (!upstreamMigrations && yoloMode) { console.log("\x1b[31m~YOLO MODE~\x1b[0m"); await dropAllDatabaseTables(client); }
  if (upstreamMigrations && hasMigrationStateDesynced(upstreamMigrations, localMigrationFiles)) await dropAllDatabaseTables(client);

  if (!upstreamMigrations && fingersCrossedMode) console.log("\x1b[33mHope you got your fingers crossed...\x1b[0m");
  console.log('Executing migrations scripts:', ...localMigrationFiles, '...')
  await migrate(db, { migrationsFolder: `migrations/${databaseId}` });

  console.log(`Saving migration state to ${upstreamMigrationStatePath(databaseId)} ...`);
  maybeOutDirAlreadyExistsMaybeNot();
  writeUpstreamMigrationState(databaseId, localMigrationFiles);

  console.log('DONE');
}
await tryMigrateDatabase('extract', process.env.EXTRACT_DATABASE_URL, process.env.EXTRACT_DATABASE_AUTH_TOKEN);
await tryMigrateDatabase('transform', process.env.TRANSFORM_DATABASE_URL, process.env.TRANSFORM_DATABASE_AUTH_TOKEN);
await tryMigrateDatabase('crawl', process.env.CRAWL_DATABASE_URL, process.env.CRAWL_DATABASE_AUTH_TOKEN);

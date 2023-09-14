#!/usr/bin/env bun
/* eslint-disable turbo/no-undeclared-env-vars */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import fs from "fs";

if (process.env.NODE_ENV === 'production') {
  console.error("Ummmmmmm... what are you doing ?!")
  process.exit(-1);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const [nodePath, execPath, command] = process.argv;

const fingersCrossedMode = command === 'fingers-crossed';
const yoloMode = command === 'yolo';
const noMigrationMode = !fingersCrossedMode && !yoloMode;

type MigrationState = {
  files: string[];
}

const selectTablesFromDatabase = async (client: ReturnType<typeof createClient>) => {
  const resultSet = await client.execute("SELECT name FROM sqlite_schema WHERE type in ('table') AND name NOT LIKE '\\_%' ESCAPE '\\'")
  return [...resultSet.rows.map(row => row.name as string), '__drizzle_migrations'];
}
const dropAllDatabaseTables = async (client: ReturnType<typeof createClient>) => {
  const tableNames = await selectTablesFromDatabase(client);
  if (tableNames.length === 1) return console.log('No tables to drop...');
  for (const tableName of tableNames) {
    try {
      console.warn('Dropping table', tableName, '...');
      await client.execute(`drop table '${tableName}'`);
    } catch (error) {
      console.error('FAILED TO DROP TABLE');
      throw error;
    }
  }
}
const upstreamMigrationStatePath = (databaseId: string) => `scripts/out/${databaseId}-migrations.upstream-ref.json`;
const upstreamMigrationStateExists = (databaseId: string) => fs.existsSync(upstreamMigrationStatePath(databaseId));
const readUpstreamMigrationState = (databaseId: string) => upstreamMigrationStateExists(databaseId) ? JSON.parse(fs.readFileSync(upstreamMigrationStatePath(databaseId), { encoding: 'utf8' })) as MigrationState : undefined;
const writeUpstreamMigrationState = (databaseId: string, files: string[]) => fs.writeFileSync(upstreamMigrationStatePath(databaseId), JSON.stringify({ files } satisfies MigrationState));
const hasMigrationStateDesynced = (migrationState: MigrationState, files: string[]) => !!migrationState.files.find((file, index) => files.indexOf(file) !== index);
const isMigrationStateEqual = (migrationState: MigrationState, files: string[]) => !files.find((file, index) => migrationState.files.indexOf(file) !== index);

const maybeOutDirAlreadyExistsMaybeNot = () => fs.existsSync('scripts/out') || fs.mkdirSync('scripts/out');

const tryMigrateDatabase = async (databaseId: string, dbUrl: string | undefined, dbToken: string | undefined) => {
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
await tryMigrateDatabase('extract', process.env.EXTRACT_DB_URL, process.env.EXTRACT_DB_TOKEN);
await tryMigrateDatabase('transform', process.env.TRANSFORM_DB_URL, process.env.TRANSFORM_DB_TOKEN);

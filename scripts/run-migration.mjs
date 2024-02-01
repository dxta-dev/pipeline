/**@typedef {import("drizzle-orm/libsql").LibSQLDatabase} LibSQLDatabase*/
import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";

export const MigrationStates = /**@type {const}*/({
  None: 'NONE',
  OutOfSync: 'OUT_OF_SYNC',
  UpToDate: 'UP_TO_DATE',
  OutOfDate: 'OUT_OF_DATE',
});

const migrationsTable = sqliteTable('__drizzle_migrations', {
  id: integer('id'),
  hash: text('hash').notNull(),
  createdAt: integer('created_at').notNull()
});

const getRemoteMigrations = async (/**@type {LibSQLDatabase}*/db) => {
  const migrations = await db.select().from(migrationsTable).all();
  migrations.sort((a, b) => a.createdAt - b.createdAt); // order by created_at ascending
  return migrations;
}

const getLocalMigrations = (/**@type {string}*/migrationsFolder) => {
  const migrationFiles = readMigrationFiles({ migrationsFolder });
  return migrationFiles.map(migrationFile => ({
    id: null,
    hash: migrationFile.hash,
    createdAt: migrationFile.folderMillis,
  }));
}

const getMigrationState = async (/**@type {LibSQLDatabase}*/db, /**@type {string[]}*/remoteTables, /**@type {string}*/migrationsFolder) => {
  const localMigrations = getLocalMigrations(migrationsFolder);

  if (!remoteTables.includes("__drizzle_migrations")) return {
    sync: MigrationStates.None,
    local: localMigrations,
    remote: []
  }

  const remoteMigrations = await getRemoteMigrations(db);

  if (localMigrations.length < remoteMigrations.length) return {
    sync: MigrationStates.OutOfSync,
    local: localMigrations,
    remote: remoteMigrations
  }

  const happyPath = localMigrations.length === remoteMigrations.length ? MigrationStates.UpToDate : MigrationStates.OutOfDate;

  for (let i = 0; i < remoteMigrations.length; i++) {
    const local = localMigrations[i];
    const remote = remoteMigrations[i];

    if (local?.hash !== remote?.hash || local?.createdAt !== remote?.createdAt) return {
      sync: MigrationStates.OutOfSync,
      local: localMigrations,
      remote: remoteMigrations,
    }
  }

  return {
    sync: happyPath,
    local: localMigrations,
    remote: remoteMigrations,
  };
}

const getRemoteTables = async (/**@type {LibSQLDatabase}*/db) => {
  const resultSet = await db.run(sql.raw("SELECT name FROM sqlite_schema WHERE type in ('table')"));
  const allTableNames = resultSet.rows.map(row => /**@type {string}*/(row.name));

  const shouldIgnoreTable = (/**@type {string}*/tableName) =>
    tableName.startsWith("libsql_") ||
    tableName.startsWith("sqlite_") ||
    tableName.startsWith("_") && tableName !== "__drizzle_migrations"
    ;

  // const ignoredTablesNames = allTableNames.filter(shouldIgnoreTable);
  // console.log(`Ignoring tables: \x1b[33m${ignoredTablesNames.join(", ")}\x1b[0m`);

  return allTableNames.filter(name => !shouldIgnoreTable(name));
}

const dropRemoteTables = async (/**@type {import("@libsql/client").Client}*/client, /**@type {string[]}*/remoteTables) => {
  if (remoteTables.length === 0) return console.log("\x1b[33mDropping... Nothing?!??!\x1b[0m"); // I don't think this is a legal path anyways, just pushing my contribution lines c:
  console.log("Dropping tables...");
  for (const table of remoteTables) {
    try {
      await client.executeMultiple(`PRAGMA foreign_keys=OFF;drop table '${table}';`);
      console.log('Dropped table:\x1b[30m', table, '\x1b[0m...');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : error;
      throw new Error(`Failed to drop table: ${table}\n${errorMessage}`);
    }
  }
  console.log("\x1b[30mThat takes care of that...\x1b[0m");
}

const pingRemote = async (/**@type {LibSQLDatabase}*/db, /**@type {string}*/url) => {
  try {
    await db.run(sql.raw("SELECT 1;"));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : error;
    throw new Error(`Failed to ping remote database at ${url}:\n${errorMessage}`);
  }
}

export const runMigration = async (/**@type {string}*/migrationsFolder,/**@type {string=} */url,/**@type {string=} */authToken, /**@type {boolean}*/yoloMode) => {
  if (!url) {
    console.error("DB URL IS NOT SET");
    return {
      db: null,
      migrationState: null
    };
  }

  console.log(`Migrating \x1b[92m${url}\x1b[0m:`);

  const rawLibsqlClient = createClient({
    url,
    authToken,
  });
  const db = drizzle(rawLibsqlClient);

  try {
    await pingRemote(db, url);
  } catch (error) {
    console.error(error);
    return {
      db: null,
      migrationState: null
    };
  }

  const remoteTables = await getRemoteTables(db);
  const migrationState = await getMigrationState(db, remoteTables, migrationsFolder);

  if (migrationState.sync === MigrationStates.UpToDate) {
    console.log('\x1b[30mDatabase is up to date\x1b[0m');
    return {
      db,
      migrationState
    }
  }
  if (!yoloMode && migrationState.sync === MigrationStates.OutOfSync) {
    console.log('\x1b[31mDatabase is out of sync.\x1b[30m Run \'migrate.mjs yolo\' to drop existing tables.\x1b[0m'); // TODO: throw ?
    return {
      db,
      migrationState
    }
  }

  if (yoloMode && migrationState.sync === MigrationStates.OutOfSync) {
    console.log("\x1b[31m~YOLO MODE~\x1b[0m");
    await dropRemoteTables(rawLibsqlClient, remoteTables);
  }

  console.log("Executing migrations...");

  await migrate(db, {
    migrationsFolder
  });

  console.log("Done.");

  return {
    db,
    migrationState
  }
}
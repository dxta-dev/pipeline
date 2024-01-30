#!/usr/bin/env bun
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { MigrationStates, runMigration } from "./run-migration.mjs";
import path from 'path';
import { fileURLToPath } from 'url';
import { seed } from "../packages/schemas/transform/src/seed/dimensions";

const [COMMAND_STRING] = process.argv.slice(2);

const YOLO_MODE = COMMAND_STRING === "yolo";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(__dirname, '..', 'migrations');

const seedTenantDb = async (db: LibSQLDatabase, migrationState: typeof MigrationStates[keyof typeof MigrationStates]) => {
  console.log(`Seeding tenant database (state=${migrationState})...`);
  const now = new Date();
  const yearBefore = new Date(Date.UTC(now.getUTCFullYear() - 1));
  const yearAfter = new Date(Date.UTC(now.getUTCFullYear() + 1));
  const nullRows = await seed(db, yearBefore, yearAfter);
  console.log("nullRows", nullRows);
}

const tenantMigration = await runMigration(path.join(migrationsFolder, 'tenant-db'), process.env.TENANT_DATABASE_URL, process.env.TENANT_DATABASE_AUTH_TOKEN, YOLO_MODE);
if (tenantMigration.db &&
  (tenantMigration.migrationState.sync === MigrationStates.None
    || (tenantMigration.migrationState.sync === MigrationStates.OutOfSync && YOLO_MODE))) await seedTenantDb(tenantMigration.db, tenantMigration.migrationState.sync);
await runMigration(path.join(migrationsFolder, 'super'), process.env.SUPER_DATABASE_URL, process.env.SUPER_DATABASE_AUTH_TOKEN, YOLO_MODE);
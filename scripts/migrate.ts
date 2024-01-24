#!/usr/bin/env bun
import { runMigration } from "./run-migration.mjs";
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(__dirname, '..','migrations');

await runMigration(path.join(migrationsFolder,'tenant-db'), process.env.TENANT_DATABASE_URL, process.env.TENANT_DATABASE_AUTH_TOKEN);
await runMigration(path.join(migrationsFolder,'super'), process.env.SUPER_DATABASE_URL, process.env.SUPER_DATABASE_AUTH_TOKEN);
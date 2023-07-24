import { describe, expect, test } from '@jest/globals';
import { unlink } from 'fs/promises';
import { getRepository } from './get-repository';

import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import Database from "better-sqlite3";
import { namespaces, repositories } from '@acme/extract-schema';
import type { NewNamespace, NewRepository } from '@acme/extract-schema';
import type { Context } from './config';

const betterSqlite = new Database("test.db");
const db = drizzle(betterSqlite);
let context: Context;
let fetchRepository: jest.Mock<Promise<{
    repository: NewRepository,
    namespace: NewNamespace
}>>

beforeAll(() => {
    migrate(db, { migrationsFolder: "../../../migrations/extract" });
    fetchRepository = jest.fn(_ => Promise.resolve({
        repository: { externalId: 1000 },
        namespace: { externalId: 2000, name: 'gengar' }
    }));

    context = {
        entities: { namespaces, repositories },
        integrations: {
            sourceControl: {
                fetchRepository
            }
        },
        db
    }

});

afterAll(async () => {
    betterSqlite.close();
    await unlink('test.db');
});

test('get-repository should insert values into db', async () => {
    const { namespace, repository } = await getRepository({ externalRepositoryId: 1000 }, context);

    expect(namespace).not.toBeNull();
    expect(repository).toBeDefined();
    expect(fetchRepository).toHaveBeenCalledTimes(1);

    const repositoryRow = db.select().from(repositories)
        .where(eq(repositories.externalId, repository.externalId)).get();
    expect(repositoryRow.externalId).toEqual(repository.externalId);
    expect(repositoryRow.id).toBeDefined();

    if (!namespace) return; // TODO: How to assert for TS that namespace is defined ?
    const namespaceRow = db.select().from(namespaces)
        .where(eq(namespaces.externalId, namespace.externalId)).get();
    expect(namespaceRow.externalId).toEqual(namespace.externalId);
    expect(namespaceRow.id).toBeDefined();

});

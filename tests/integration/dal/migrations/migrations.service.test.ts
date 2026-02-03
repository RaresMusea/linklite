import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { checkDbMigrations, checkReady } from '@/dal/migrations/migrations.service';
import { ReadinessError } from '@/lib/errors/ReadinessError';

const createMigrationsTable = async (): Promise<void> => {
    await prisma.$executeRaw`
        CREATE TABLE _prisma_migrations (
            id VARCHAR(36) PRIMARY KEY,
            checksum VARCHAR(64) NOT NULL,
            finished_at TIMESTAMPTZ,
            migration_name VARCHAR(255) NOT NULL,
            logs TEXT,
            rolled_back_at TIMESTAMPTZ,
            started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            applied_steps_count INTEGER NOT NULL DEFAULT 0
        )
    `;
};

describe('Database migrations service integration tests', () => {
    beforeAll(async () => {
        await prisma.$connect();
    });

    afterAll(async () => {
        await prisma.$executeRaw`DROP TABLE IF EXISTS _prisma_migrations CASCADE`;
        await prisma.$disconnect();
    });

    beforeEach(async () => {
        await prisma.$executeRaw`DROP TABLE IF EXISTS _prisma_migrations CASCADE`;
    });

    describe('Check database migrations', () => {
        it('Should return null when migrations table does not exist', async () => {
            await expect(checkDbMigrations()).resolves.toBeNull();
        });

        it('Should throw ReadinessError when there are pending migrations', async () => {
            await createMigrationsTable();
            await prisma.$executeRaw`
                INSERT INTO _prisma_migrations
                    (id, checksum, migration_name, finished_at, rolled_back_at, started_at, applied_steps_count)
                VALUES
                    ('pending-1', 'checksum-1', '001_pending', NULL, NULL, NOW(), 0)
            `;

            await expect(checkDbMigrations()).rejects.toBeInstanceOf(ReadinessError);
        });

        it('Should return null when there are no pending or applied migrations', async () => {
            await createMigrationsTable();

            await expect(checkDbMigrations()).resolves.toBeNull();
        });

        it('Should return the last applied migration when no pending migrations exist', async () => {
            await createMigrationsTable();

            await prisma.$executeRaw`
                INSERT INTO _prisma_migrations
                    (id, checksum, migration_name, finished_at, rolled_back_at, started_at, applied_steps_count)
                VALUES
                    ('applied-1', 'checksum-1', '001_init', '2024-01-01T00:00:00Z', NULL, '2024-01-01T00:00:00Z', 1),
                    ('applied-2', 'checksum-2', '002_add_table', '2024-02-01T00:00:00Z', NULL, '2024-02-01T00:00:00Z', 1)
            `;

            const result = await checkDbMigrations();

            expect(result).not.toBeNull();
            expect(result?.migrationName).toBe('002_add_table');
            expect(result?.appliedStepsCount).toBe(1);
            expect(result?.finishedAt?.toISOString()).toBe('2024-02-01T00:00:00.000Z');
            expect(result?.startedAt?.toISOString()).toBe('2024-02-01T00:00:00.000Z');
        });
    });

    describe('Check database readiness', () => {
        it('Should return ok true with null migration when migrations table does not exist', async () => {
            await expect(checkReady()).resolves.toEqual({ ok: true, migration: null });
        });

        it('Should return ok true with last migration when applied migrations exist', async () => {
            await createMigrationsTable();
            await prisma.$executeRaw`
                INSERT INTO _prisma_migrations
                    (id, checksum, migration_name, finished_at, rolled_back_at, started_at, applied_steps_count)
                VALUES
                    ('applied-1', 'checksum-1', '001_init', '2024-01-01T00:00:00Z', NULL, '2024-01-01T00:00:00Z', 1),
                    ('applied-2', 'checksum-2', '002_add_table', '2024-02-01T00:00:00Z', NULL, '2024-02-01T00:00:00Z', 1)
            `;

            const result = await checkReady();

            expect(result.ok).toBe(true);
            expect(result.migration?.migrationName).toBe('002_add_table');
            expect(result.migration?.finishedAt?.toISOString()).toBe('2024-02-01T00:00:00.000Z');
        });

        it('Should throw ReadinessError when pending migrations exist', async () => {
            await createMigrationsTable();
            await prisma.$executeRaw`
                INSERT INTO _prisma_migrations
                    (id, checksum, migration_name, finished_at, rolled_back_at, started_at, applied_steps_count)
                VALUES
                    ('pending-1', 'checksum-1', '001_pending', NULL, NULL, NOW(), 0)
            `;

            try {
                await checkReady();
                expect.fail('Expected checkReady to throw');
            } catch (error) {
                expect(error).toBeInstanceOf(ReadinessError);
                expect((error as ReadinessError).reason).toBe('migrations');
                expect((error as ReadinessError).message).toBe('Database has 1 unfinished migrations');
            }
        });
    });
});

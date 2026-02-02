import { describe, beforeAll, beforeEach, it, expect, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
    countAppliedMigrations,
    countPendingMigrations,
    getLastAppliedMigration,
    migrationsTableExists,
} from '@/dal/migrations/migrations.repo';
import { PrismaClient } from '@/generated/prisma/client';

describe('Database migrations repository integration tests', () => {
    let testPrisma: PrismaClient;

    beforeAll(async () => {
        testPrisma = prisma;
        await testPrisma.$connect();
        await testPrisma.$executeRaw`DROP TABLE IF EXISTS _prisma_migrations CASCADE`;
    });

    afterAll(async () => {
        // Cleanup final
        await testPrisma.$executeRaw`DROP TABLE IF EXISTS _prisma_migrations CASCADE`;
        await testPrisma.$executeRaw`DROP TABLE IF EXISTS test_table CASCADE`;
        await testPrisma.$executeRaw`DROP TABLE IF EXISTS _PRISMA_MIGRATIONS CASCADE`;
        await testPrisma.$executeRaw`DROP TABLE IF EXISTS prisma_migrations CASCADE`;
        await testPrisma.$executeRaw`DROP TABLE IF EXISTS _prisma_migrations_test CASCADE`;
        await testPrisma.$executeRaw`DROP TABLE IF EXISTS _prisma_migrations_ CASCADE`;
        await testPrisma.$executeRaw`DROP SCHEMA IF EXISTS test_schema CASCADE`;
        await testPrisma.$disconnect();
    });

    beforeEach(async () => {
        await testPrisma.$executeRaw`DROP TABLE IF EXISTS _prisma_migrations CASCADE`;
    });

    describe('Migration table existence check', () => {
        describe('When migrations table does not exist', () => {
            it('Should return false when table does not exist', async () => {
                const result = await migrationsTableExists();
                expect(result).toBe(false);
            });

            it('Should return false even after other operations', async () => {
                await testPrisma.$executeRaw`CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY)`;

                const result = await migrationsTableExists();
                expect(result).toBe(false);

                await testPrisma.$executeRaw`DROP TABLE IF EXISTS test_table`;
            });
        });

        describe('When migrations table exists', () => {
            beforeEach(async () => {
                await testPrisma.$executeRaw`
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
            });

            it('Should return true when table exists with correct schema', async () => {
                const result = await migrationsTableExists();
                expect(result).toBe(true);
            });

            it('Should return true even with empty table', async () => {
                await testPrisma.$executeRaw`DROP TABLE _prisma_migrations`;
                await testPrisma.$executeRaw`
                CREATE TABLE _prisma_migrations (
                    id VARCHAR(36) PRIMARY KEY
                )
            `;

                const result = await migrationsTableExists();
                expect(result).toBe(true);
            });
        });

        describe('Edge cases and error handling', () => {
            it('Should handle case sensitivity correctly', async () => {
                await testPrisma.$executeRaw`CREATE TABLE "_PRISMA_MIGRATIONS" (id SERIAL PRIMARY KEY)`;

                const result = await migrationsTableExists();
                expect(result).toBe(false);

                await testPrisma.$executeRaw`DROP TABLE IF EXISTS "_PRISMA_MIGRATIONS"`;
            });

            it('Should work correctly after table is dropped and recreated', async () => {
                await testPrisma.$executeRaw`
                CREATE TABLE _prisma_migrations (id VARCHAR(36) PRIMARY KEY)
            `;

                expect(await migrationsTableExists()).toBe(true);

                await testPrisma.$executeRaw`DROP TABLE _prisma_migrations`;
                expect(await migrationsTableExists()).toBe(false);

                await testPrisma.$executeRaw`
                CREATE TABLE _prisma_migrations (id VARCHAR(36) PRIMARY KEY)
            `;
                expect(await migrationsTableExists()).toBe(true);
            });

            it('Should handle concurrent calls correctly', async () => {
                const promises = Array(5)
                    .fill(null)
                    .map(() => migrationsTableExists());
                const results = await Promise.all(promises);

                results.forEach((result) => {
                    expect(result).toBe(false);
                });
            });
        });

        describe('Database schema specific tests', () => {
            it('Should only check public schema by default', async () => {
                await testPrisma.$executeRaw`CREATE SCHEMA IF NOT EXISTS test_schema`;
                await testPrisma.$executeRaw`
                CREATE TABLE test_schema._prisma_migrations (id VARCHAR(36) PRIMARY KEY)
            `;

                const result = await migrationsTableExists();
                expect(result).toBe(false);

                await testPrisma.$executeRaw`DROP SCHEMA IF EXISTS test_schema CASCADE`;
            });

            it('Should ignore tables with similar names', async () => {
                await testPrisma.$executeRaw`CREATE TABLE prisma_migrations (id SERIAL PRIMARY KEY)`;
                await testPrisma.$executeRaw`CREATE TABLE _prisma_migrations_test (id SERIAL PRIMARY KEY)`;
                await testPrisma.$executeRaw`CREATE TABLE _prisma_migrations_ (id SERIAL PRIMARY KEY)`;

                const result = await migrationsTableExists();
                expect(result).toBe(false);

                await testPrisma.$executeRaw`CREATE TABLE _prisma_migrations (id VARCHAR(36) PRIMARY KEY)`;
                const newResult = await migrationsTableExists();
                expect(newResult).toBe(true);

                await testPrisma.$executeRaw`
                DROP TABLE IF EXISTS 
                    prisma_migrations, 
                    _prisma_migrations_test, 
                    _prisma_migrations_, 
                    _prisma_migrations
            `;
            });
        });
    });

    describe('Count pending migrations', () => {
        beforeEach(async () => {
            await testPrisma.$executeRaw`DROP TABLE IF EXISTS _prisma_migrations`;
            await testPrisma.$executeRaw`
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
        });

        describe('When table is empty', () => {
            it('Should return 0 when there are no migrations', async () => {
                const result = await countPendingMigrations();
                expect(result).toBe(0);
            });

            it('Should return 0 even with other tables present', async () => {
                await testPrisma.$executeRaw`CREATE TABLE test_table (id SERIAL PRIMARY KEY)`;

                const result = await countPendingMigrations();
                expect(result).toBe(0);

                await testPrisma.$executeRaw`DROP TABLE _prisma_migrations`;
            });
        });

        describe('When there are completed migrations', () => {
            it('Should return 0 when all migrations are finished', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', NOW(), NOW(), 1),
                    ('uuid2', 'checksum2', '002_add_users', NOW(), NOW(), 1),
                    ('uuid3', 'checksum3', '003_add_posts', NOW(), NOW(), 1)
            `;

                const result = await countPendingMigrations();
                expect(result).toBe(0);
            });

            it('Should return 0 when migrations are rolled back', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, rolled_back_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', NOW(), NOW(), 1),
                    ('uuid2', 'checksum2', '002_add_users', NOW(), NOW(), 1)
            `;

                const result = await countPendingMigrations();
                expect(result).toBe(0);
            });

            it('Should return 0 when migrations have both finished_at and rolled_back_at', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, rolled_back_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', NOW(), NOW(), NOW(), 1)
            `;

                const result = await countPendingMigrations();
                expect(result).toBe(0);
            });
        });

        describe('When there are pending migrations', () => {
            it('Should count migrations with null finished_at and null rolled_back_at', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', NOW(), 1),
                    ('uuid2', 'checksum2', '002_add_users', NOW(), 1)
            `;

                const result = await countPendingMigrations();
                expect(result).toBe(2);
            });

            it('Should count only pending migrations among mixed status', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, rolled_back_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', NOW(), NULL, NOW(), 1), -- finished
                    ('uuid2', 'checksum2', '002_add_users', NULL, NOW(), NOW(), 1), -- rolled back
                    ('uuid3', 'checksum3', '003_add_posts', NULL, NULL, NOW(), 1), -- pending
                    ('uuid4', 'checksum4', '004_add_comments', NULL, NULL, NOW(), 1), -- pending
                    ('uuid5', 'checksum5', '005_add_likes', NOW(), NOW(), NOW(), 1) -- both finished and rolled back
            `;

                const result = await countPendingMigrations();
                expect(result).toBe(2); // Doar uuid3 și uuid4 sunt pending
            });

            it('Should handle large number of pending migrations', async () => {
                const migrations = Array.from({ length: 100 }, (_, i) => ({
                    id: `uuid${i + 1}`,
                    checksum: `checksum${i + 1}`,
                    name: `00${String(i + 1).padStart(3, '0')}_migration`,
                    started_at: new Date(),
                }));

                for (const migration of migrations) {
                    await testPrisma.$executeRaw`
                    INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, applied_steps_count)
                    VALUES (${migration.id}, ${migration.checksum}, ${migration.name}, ${migration.started_at}, 1)
                `;
                }

                const result = await countPendingMigrations();
                expect(result).toBe(100);
            });
        });

        describe('Edge cases and data types', () => {
            it('Should handle migrations with started_at in the future', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', NOW() + INTERVAL '1 day', 1)
            `;

                const result = await countPendingMigrations();
                expect(result).toBe(1);
            });

            it('Should handle migrations with NULL started_at (though unlikely)', async () => {
                await testPrisma.$executeRaw`
                ALTER TABLE _prisma_migrations ALTER COLUMN started_at DROP NOT NULL
            `;

                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, applied_steps_count)
                VALUES ('uuid1', 'checksum1', '001_init', 1)
            `;

                const result = await countPendingMigrations();
                expect(result).toBe(1);
            });

            it('Should return 0 when table does not exist', async () => {
                await testPrisma.$executeRaw`DROP TABLE _prisma_migrations`;

                const result = await countPendingMigrations();
                expect(result).toBe(0);
            });
        });

        describe('Concurrent operations', () => {
            it('Should provide consistent count during concurrent inserts', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', NOW(), 1),
                    ('uuid2', 'checksum2', '002_add_users', NOW(), 1)
            `;

                const initialCount = await countPendingMigrations();
                expect(initialCount).toBe(2);

                const insertPromises = Array.from(
                    { length: 3 },
                    (_, i) =>
                        testPrisma.$executeRaw`
                    INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, applied_steps_count)
                    VALUES (${`new-uuid${i}`}, ${`new-checksum${i}`}, ${`00${i + 3}_migration`}, NOW(), 1)
                `
                );

                const countPromises = Array.from({ length: 5 }, () => countPendingMigrations());
                await Promise.all([...insertPromises, ...countPromises]);

                const finalCount = await countPendingMigrations();
                expect(finalCount).toBe(5);
            });
        });

        describe('Data validation', () => {
            it('Should handle special characters in migration names', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init_with-dashes', NOW(), 1),
                    ('uuid2', 'checksum2', '002_add_underscores_and_CAPITALS', NOW(), 1),
                    ('uuid3', 'checksum3', '003_êmîgrâtïøn_ñámèß', NOW(), 1)
            `;

                const result = await countPendingMigrations();
                expect(result).toBe(3);
            });

            it('Should handle different timestamp precisions', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', '2024-01-01 10:00:00', 1),
                    ('uuid2', 'checksum2', '002_add_users', '2024-01-01 10:00:00.123456', 1),
                    ('uuid3', 'checksum3', '003_add_posts', '2024-01-01 10:00:00.000001', 1)
            `;

                const result = await countPendingMigrations();
                expect(result).toBe(3);
            });
        });
    });

    describe('Count applied migrations', () => {
        beforeEach(async () => {
            await testPrisma.$executeRaw`DROP TABLE IF EXISTS _prisma_migrations`;
            await testPrisma.$executeRaw`
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
        });

        describe('When table does not exist', () => {
            it('Should return 0 when migrations table does not exist', async () => {
                await testPrisma.$executeRaw`DROP TABLE _prisma_migrations`;

                const result = await countAppliedMigrations();
                expect(result).toBe(0);
            });

            it('Should return 0 even with other tables present', async () => {
                await testPrisma.$executeRaw`DROP TABLE _prisma_migrations`;
                await testPrisma.$executeRaw`CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY)`;

                const result = await countAppliedMigrations();
                expect(result).toBe(0);

                await testPrisma.$executeRaw`DROP TABLE "test_table"`;
            });
        });

        describe('When table is empty', () => {
            it('Should return 0 when there are no migrations in the table', async () => {
                const result = await countAppliedMigrations();
                expect(result).toBe(0);
            });
        });

        describe('When there are only pending migrations', () => {
            it('Should return 0 when all migrations are pending (no finished_at)', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', NOW(), 1),
                    ('uuid2', 'checksum2', '002_add_users', NOW(), 1),
                    ('uuid3', 'checksum3', '003_add_posts', NOW(), 1)
            `;

                const result = await countAppliedMigrations();
                expect(result).toBe(0);
            });

            it('Should return 0 when migrations have NULL finished_at', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', NULL, NOW(), 1),
                    ('uuid2', 'checksum2', '002_add_users', NULL, NOW(), 1)
            `;

                const result = await countAppliedMigrations();
                expect(result).toBe(0);
            });
        });

        describe('When there are applied migrations', () => {
            it('Should count migrations with finished_at not null and rolled_back_at null', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', NOW(), NOW(), 1),
                    ('uuid2', 'checksum2', '002_add_users', NOW(), NOW(), 1)
            `;

                const result = await countAppliedMigrations();
                expect(result).toBe(2);
            });

            it('Should count only applied migrations among mixed status', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, rolled_back_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', NOW(), NULL, NOW(), 1), -- applied
                    ('uuid2', 'checksum2', '002_add_users', NULL, NULL, NOW(), 1), -- pending
                    ('uuid3', 'checksum3', '003_add_posts', NOW(), NULL, NOW(), 1), -- applied
                    ('uuid4', 'checksum4', '004_add_comments', NULL, NOW(), NOW(), 1), -- rolled back
                    ('uuid5', 'checksum5', '005_add_likes', NOW(), NOW(), NOW(), 1) -- rolled back (even with finished_at)
            `;

                const result = await countAppliedMigrations();
                expect(result).toBe(2);
            });

            it('Should handle migrations with different finished_at timestamps', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', '2024-01-01 10:00:00', '2024-01-01 09:00:00', 1),
                    ('uuid2', 'checksum2', '002_add_users', '2024-01-02 11:00:00', '2024-01-02 10:00:00', 1),
                    ('uuid3', 'checksum3', '003_add_posts', '2024-01-03 12:00:00', '2024-01-03 11:00:00', 1)
            `;

                const result = await countAppliedMigrations();
                expect(result).toBe(3);
            });
        });

        describe('When there are rolled back migrations', () => {
            it('Should not count migrations with rolled_back_at not null', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, rolled_back_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', NOW(), NOW(), 1),
                    ('uuid2', 'checksum2', '002_add_users', NOW(), NOW(), 1)
            `;

                const result = await countAppliedMigrations();
                expect(result).toBe(0);
            });

            it('Should not count migrations with both finished_at and rolled_back_at', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, rolled_back_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', NOW(), NOW(), NOW(), 1),
                    ('uuid2', 'checksum2', '002_add_users', NOW(), NOW(), NOW(), 1)
            `;

                const result = await countAppliedMigrations();
                expect(result).toBe(0);
            });
        });

        describe('Edge cases and data validation', () => {
            it('Should handle large number of applied migrations', async () => {
                const migrations = Array.from({ length: 100 }, (_, i) => ({
                    id: `uuid${i + 1}`,
                    checksum: `checksum${i + 1}`,
                    name: `00${String(i + 1).padStart(3, '0')}_migration`,
                    started_at: new Date(),
                    finished_at: new Date(Date.now() + 1000),
                }));

                for (const migration of migrations) {
                    await testPrisma.$executeRaw`
                    INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
                    VALUES (${migration.id}, ${migration.checksum}, ${migration.name}, ${migration.started_at}, ${migration.finished_at}, 1)
                `;
                }

                const result = await countAppliedMigrations();
                expect(result).toBe(100);
            });

            it('Should handle migrations with future finished_at dates', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', NOW() + INTERVAL '1 day', NOW(), 1)
            `;

                const result = await countAppliedMigrations();
                expect(result).toBe(1);
            });

            it('Should handle edge case where started_at is after finished_at', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', '2024-01-01 10:00:00', '2024-01-01 11:00:00', 1)
            `;

                const result = await countAppliedMigrations();
                expect(result).toBe(1);
            });

            it('Should handle migrations with zero applied_steps_count', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', NOW(), NOW(), 0)
            `;

                const result = await countAppliedMigrations();
                expect(result).toBe(1);
            });
        });

        describe('Concurrent operations', () => {
            it('Should provide consistent count during concurrent operations', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', NOW(), NOW(), 1),
                    ('uuid2', 'checksum2', '002_add_users', NOW(), NOW(), 1)
            `;

                const initialCount = await countAppliedMigrations();
                expect(initialCount).toBe(2);

                const insertPromises = Array.from(
                    { length: 3 },
                    (_, i) =>
                        testPrisma.$executeRaw`
                    INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
                    VALUES (${`new-uuid${i}`}, ${`new-checksum${i}`}, ${`00${i + 3}_migration`}, NOW(), NOW(), 1)
                `
                );

                const countPromises = Array.from({ length: 5 }, () => countAppliedMigrations());

                await Promise.all([...insertPromises, ...countPromises]);

                const finalCount = await countAppliedMigrations();
                expect(finalCount).toBe(5);
            });
        });

        describe('Data consistency', () => {
            it('Should return consistent results with multiple calls', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', NOW(), NOW(), 1),
                    ('uuid2', 'checksum2', '002_add_users', NULL, NOW(), 1),
                    ('uuid3', 'checksum3', '003_add_posts', NOW(), NOW(), 1)
            `;

                const results = await Promise.all([
                    countAppliedMigrations(),
                    countAppliedMigrations(),
                    countAppliedMigrations(),
                ]);

                results.forEach((result) => {
                    expect(result).toBe(2);
                });

                const totalMigrations = 3;
                await countPendingMigrations();
                await countAppliedMigrations();

                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, rolled_back_at, started_at, applied_steps_count)
                VALUES ('uuid4', 'checksum4', '004_rollback', NOW(), NOW(), 1)
            `;

                await countPendingMigrations();
                const newAppliedCount = await countAppliedMigrations();

                expect(newAppliedCount).toBeLessThanOrEqual(totalMigrations + 1);
            });
        });
    });

    describe('Get last applied migration', () => {
        beforeEach(async () => {
            await testPrisma.$executeRaw`DROP TABLE IF EXISTS _prisma_migrations`;
            await testPrisma.$executeRaw`
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
        });

        describe('When table does not exist', () => {
            it('Should return null when migrations table does not exist', async () => {
                await testPrisma.$executeRaw`DROP TABLE _prisma_migrations`;

                const result = await getLastAppliedMigration();
                expect(result).toBeNull();
            });
        });

        describe('When table is empty', () => {
            it('Should return null when there are no migrations in the table', async () => {
                const result = await getLastAppliedMigration();
                expect(result).toBeNull();
            });
        });

        describe('When there are no applied migrations', () => {
            it('Should return null when all migrations are pending', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', NOW(), 1),
                    ('uuid2', 'checksum2', '002_add_users', NOW(), 1),
                    ('uuid3', 'checksum3', '003_add_posts', NOW(), 1)
            `;

                const result = await getLastAppliedMigration();
                expect(result).toBeNull();
            });

            it('Should return null when all migrations are rolled back', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, rolled_back_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', NOW(), NOW(), 1),
                    ('uuid2', 'checksum2', '002_add_users', NOW(), NOW(), 1)
            `;

                const result = await getLastAppliedMigration();
                expect(result).toBeNull();
            });

            it('Should return null when migrations have both finished_at and rolled_back_at', async () => {
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, rolled_back_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', NOW(), NOW(), NOW(), 1),
                    ('uuid2', 'checksum2', '002_add_users', NOW(), NOW(), NOW(), 1)
            `;

                const result = await getLastAppliedMigration();
                expect(result).toBeNull();
            });
        });

        describe('When there are applied migrations', () => {
            it('Should return the most recently finished migration', async () => {
                const now = new Date();
                const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', ${twoDaysAgo}, ${twoDaysAgo}, 1),
                    ('uuid2', 'checksum2', '002_add_users', ${yesterday}, ${yesterday}, 1),
                    ('uuid3', 'checksum3', '003_add_posts', ${now}, ${now}, 1)
            `;

                const result = await getLastAppliedMigration();
                expect(result).not.toBeNull();
                expect(result!.migrationName).toBe('003_add_posts');
                expect(result!.finishedAt).toEqual(now);
                expect(result!.startedAt).toEqual(now);
                expect(result!.appliedStepsCount).toBe(1);
            });

            it('Should ignore pending migrations when determining the last applied one', async () => {
                const now = new Date();
                const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', ${yesterday}, ${yesterday}, 1),
                    ('uuid2', 'checksum2', '002_add_users', ${now}, ${now}, 1),
                    ('uuid3', 'checksum3', '003_add_posts', NULL, ${now}, 1) -- pending
            `;

                const result = await getLastAppliedMigration();
                expect(result).not.toBeNull();
                expect(result!.migrationName).toBe('002_add_users');
            });

            it('Should ignore rolled back migrations when determining the last applied one', async () => {
                const now = new Date();
                const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, rolled_back_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', ${yesterday}, ${yesterday}, ${yesterday}, 1), -- rolled back
                    ('uuid2', 'checksum2', '002_add_users', ${now}, NULL, ${now}, 1), -- applied
                    ('uuid3', 'checksum3', '003_add_posts', ${now}, ${now}, ${now}, 1) -- rolled back
            `;

                const result = await getLastAppliedMigration();
                expect(result).not.toBeNull();
                expect(result!.migrationName).toBe('002_add_users');
            });

            it('Should handle migrations with the exact same finished_at timestamp', async () => {
                const timestamp = new Date('2024-01-01T10:00:00Z');

                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', ${timestamp}, ${timestamp}, 1),
                    ('uuid2', 'checksum2', '002_add_users', ${timestamp}, ${timestamp}, 1),
                    ('uuid3', 'checksum3', '003_add_posts', ${timestamp}, ${timestamp}, 1)
            `;

                const result = await getLastAppliedMigration();
                expect(result).not.toBeNull();
                // Dacă toate au același finished_at, LIMIT 1 va returna unul arbitrar
                // Testăm că returnează ceva valid
                expect(['001_init', '002_add_users', '003_add_posts']).toContain(result!.migrationName);
                expect(result!.finishedAt).toEqual(timestamp);
            });
        });

        describe('Edge cases and data validation', () => {
            it('Should return correct data structure', async () => {
                const now = new Date();

                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', ${now}, ${now}, 5)
            `;

                const result = await getLastAppliedMigration();
                expect(result).toEqual({
                    migrationName: '001_init',
                    startedAt: now,
                    finishedAt: now,
                    appliedStepsCount: 5,
                });
            });

            it('Should handle migrations with special characters in names', async () => {
                const now = new Date();

                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init-with-dashes', ${now}, ${now}, 1),
                    ('uuid2', 'checksum2', '002_add_underscores_and_CAPITALS', ${now}, ${now}, 1),
                    ('uuid3', 'checksum3', '003_êmîgrâtïøn_ñámèß', ${now}, ${now}, 1)
            `;

                const result = await getLastAppliedMigration();
                expect(result).not.toBeNull();
                expect(result!.migrationName).toBeOneOf([
                    '001_init-with-dashes',
                    '002_add_underscores_and_CAPITALS',
                    '003_êmîgrâtïøn_ñámèß',
                ]);
            });

            it('Should handle migrations with different applied_steps_count values', async () => {
                const now = new Date();

                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '3 hours', 3),
                    ('uuid2', 'checksum2', '002_add_users', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '2 hours', 0),
                    ('uuid3', 'checksum3', '003_add_posts', ${now}, ${now}, 15)
            `;

                const result = await getLastAppliedMigration();
                expect(result).not.toBeNull();
                expect(result!.migrationName).toBe('003_add_posts');
                expect(result!.appliedStepsCount).toBe(15);
            });
        });

        describe('Concurrent operations', () => {
            it('Should provide consistent result during concurrent inserts', async () => {
                // Adaugă câteva migrări aplicat inițiale
                const initialTime = new Date('2024-01-01T10:00:00Z');
                await testPrisma.$executeRaw`
                INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
                VALUES 
                    ('uuid1', 'checksum1', '001_init', ${initialTime}, ${initialTime}, 1),
                    ('uuid2', 'checksum2', '002_add_users', ${initialTime}, ${initialTime}, 1)
            `;

                const initialResult = await getLastAppliedMigration();
                expect(initialResult).not.toBeNull();

                // Adaugă concurrent mai multe migrări
                const laterTime = new Date('2024-01-01T11:00:00Z');
                const insertPromises = Array.from(
                    { length: 3 },
                    (_, i) =>
                        testPrisma.$executeRaw`
                    INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
                    VALUES (${`new-uuid${i}`}, ${`new-checksum${i}`}, ${`00${i + 3}_migration`}, ${laterTime}, ${laterTime}, 1)
                `
                );

                const readPromises = Array.from({ length: 5 }, () => getLastAppliedMigration());

                await Promise.all([...insertPromises, ...readPromises]);

                const finalResult = await getLastAppliedMigration();
                expect(finalResult).not.toBeNull();
                expect(finalResult!.migrationName).toMatch(/00[345]_migration/);
            });
        });

        describe('Performance considerations', () => {
            it('Should handle large number of migrations efficiently', async () => {
                const migrations = Array.from({ length: 1000 }, (_, i) => {
                    const migrationNumber = i + 1;
                    return {
                        id: `uuid${migrationNumber}`,
                        checksum: `checksum${migrationNumber}`,
                        name: `${String(migrationNumber).padStart(4, '0')}_migration`, // padStart(4, '0')
                        started_at: new Date(Date.now() - (1000 - i) * 1000),
                        finished_at: new Date(Date.now() - (1000 - i) * 1000 + 50000),
                    };
                });

                for (let i = 0; i < migrations.length; i += 100) {
                    const batch = migrations.slice(i, i + 100);
                    const values = batch
                        .map(
                            (m) =>
                                `('${m.id}', '${m.checksum}', '${m.name}', '${m.finished_at.toISOString()}', '${m.started_at.toISOString()}', 1)`
                        )
                        .join(', ');

                    await testPrisma.$executeRawUnsafe(`
                        INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, started_at, applied_steps_count) VALUES ${values}
                    `);
                }

                const startTime = Date.now();
                const result = await getLastAppliedMigration();
                const endTime = Date.now();

                expect(result).not.toBeNull();
                expect(result!.migrationName).toBe('1000_migration'); // Fără leading zeros

                expect(endTime - startTime).toBeLessThan(100);
            });
        });
    });
});

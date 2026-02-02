import { describe, beforeAll, beforeEach, it, expect, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { migrationsTableExists } from '@/dal/migrations/migrations.repo';
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

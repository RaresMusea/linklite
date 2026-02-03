import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReadinessError } from '@/lib/errors/ReadinessError';

vi.mock('@/dal/migrations/migrations.repo', () => ({
    countPendingMigrations: vi.fn(),
    getLastAppliedMigration: vi.fn(),
}));

vi.mock('@/dal/db/db.service', () => ({
    checkDbReachable: vi.fn(),
}));

vi.mock('@/lib/logging/logger', () => ({
    logger: {
        with: () => ({
            debug: vi.fn(),
            error: vi.fn(),
        }),
    },
}));

import { countPendingMigrations, getLastAppliedMigration } from '@/dal/migrations/migrations.repo';
import { checkDbMigrations, checkReady } from '@/dal/migrations/migrations.service';
import { checkDbReachable } from '@/dal/db/db.service';

const mockMigration = {
    migrationName: '002_add_table',
    startedAt: new Date('2024-02-01T00:00:00Z'),
    finishedAt: new Date('2024-02-01T00:00:00Z'),
    appliedStepsCount: 1,
};

describe('Check database migrations unit tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Should throw ReadinessError when there are pending migrations', async () => {
        vi.mocked(countPendingMigrations).mockResolvedValue(2);

        await expect(checkDbMigrations()).rejects.toBeInstanceOf(ReadinessError);
        expect(getLastAppliedMigration).not.toHaveBeenCalled();
    });

    it('Should return null when there are no pending migrations and no last migration', async () => {
        vi.mocked(countPendingMigrations).mockResolvedValue(0);
        vi.mocked(getLastAppliedMigration).mockResolvedValue(null);

        await expect(checkDbMigrations()).resolves.toBeNull();
        expect(getLastAppliedMigration).toHaveBeenCalledTimes(1);
    });

    it('Should return last migration when there are no pending migrations', async () => {
        vi.mocked(countPendingMigrations).mockResolvedValue(0);
        vi.mocked(getLastAppliedMigration).mockResolvedValue(mockMigration);

        await expect(checkDbMigrations()).resolves.toEqual(mockMigration);
        expect(getLastAppliedMigration).toHaveBeenCalledTimes(1);
    });
});

describe('Check database readiness unit tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Should return ok true with migration when dependencies succeed', async () => {
        vi.mocked(checkDbReachable).mockResolvedValue(undefined);
        const migration = { ...mockMigration };
        vi.mocked(countPendingMigrations).mockResolvedValue(0);
        vi.mocked(getLastAppliedMigration).mockResolvedValue(migration);

        await expect(checkReady()).resolves.toEqual({ ok: true, migration });
        expect(checkDbReachable).toHaveBeenCalledTimes(1);
    });

    it('Should propagate ReadinessError when checkDbReachable fails', async () => {
        const err = new ReadinessError('database', 'Database not reachable');
        vi.mocked(checkDbReachable).mockRejectedValueOnce(err);
        const checkDbMigrationsSpy = vi.spyOn(
            await import('@/dal/migrations/migrations.service'),
            'checkDbMigrations'
        );

        try {
            await checkReady();
            expect.fail('Expected checkReady to throw');
        } catch (error) {
            expect(error).toBe(err);
            expect(error).toBeInstanceOf(ReadinessError);
            expect((error as ReadinessError).reason).toBe('database');
            expect((error as ReadinessError).message).toBe('Database not reachable');
        }
        expect(checkDbMigrationsSpy).not.toHaveBeenCalled();
    });

    it('Should propagate ReadinessError when checkDbMigrations fails', async () => {
        vi.mocked(checkDbReachable).mockResolvedValue(undefined);
        vi.mocked(countPendingMigrations).mockResolvedValue(2);

        try {
            await checkReady();
            expect.fail('Expected checkReady to throw');
        } catch (error) {
            expect(error).toBeInstanceOf(ReadinessError);
            expect((error as ReadinessError).reason).toBe('migrations');
            expect((error as ReadinessError).message).toBe('Database has 2 unfinished migrations');
        }
        expect(checkDbReachable).toHaveBeenCalledTimes(1);
    });
});

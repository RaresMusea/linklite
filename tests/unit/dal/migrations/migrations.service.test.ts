import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReadinessError } from '@/lib/errors/ReadinessError';

vi.mock('@/dal/migrations/migrations.repo', () => ({
    countPendingMigrations: vi.fn(),
    getLastAppliedMigration: vi.fn(),
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
import { checkDbMigrations } from '@/dal/migrations/migrations.service';

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

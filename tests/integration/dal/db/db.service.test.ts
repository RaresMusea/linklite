import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { pingDb } from '@/dal/db/db.repo';
import { checkDbReachable } from '@/dal/db/db.service';
import { ReadinessError } from '@/lib/errors/ReadinessError';

describe('Database service integration tests', () => {
    beforeAll(async () => {
        await prisma.$connect();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('pingDb', () => {
        it('Should resolve when the database is reachable', async () => {
            await expect(pingDb()).resolves.toBeUndefined();
        });
    });

    describe('checkDbReachable', () => {
        it('Should not throw when the database is reachable', async () => {
            await expect(checkDbReachable()).resolves.toBeUndefined();
        });

        it('Should throw ReadinessError when database is not reachable', async () => {
            const pingSpy = vi.spyOn(await import('@/dal/db/db.repo'), 'pingDb').mockRejectedValueOnce(
                new Error('db down')
            );

            await expect(checkDbReachable()).rejects.toBeInstanceOf(ReadinessError);

            pingSpy.mockRestore();
        });

        it('Should throw ReadinessError when pingDb exceeds timeout', async () => {
            vi.useFakeTimers();
            const pingSpy = vi
                .spyOn(await import('@/dal/db/db.repo'), 'pingDb')
                .mockImplementationOnce(() => new Promise(() => undefined));

            const promise = checkDbReachable(10);
            const assertion = expect(promise).rejects.toBeInstanceOf(ReadinessError);
            await vi.advanceTimersByTimeAsync(10);

            await assertion;

            pingSpy.mockRestore();
        });
    });
});

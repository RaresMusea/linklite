import { beforeEach, describe, expect, it } from 'vitest';
import { incrementAnonActorQuotaCountTx, upsertAnonActor } from '@/dal/anon_actors/anon_actors.repo';
import { prisma } from '@/lib/prisma';
import { resetDb } from '@/tests/helpers/db';

describe('Anon Actors Repository Integration Tests', () => {
    beforeEach(async () => {
        await resetDb();
    });

    describe('Upsert Anon Actor', () => {
        it('Should create a new anon actor when none exists', async () => {
            // Act
            await upsertAnonActor('anon-1', 'hash-1');

            // Assert
            const actor = await prisma.anonActor.findUnique({
                where: { anonId: 'anon-1' },
            });

            expect(actor).not.toBeNull();
            expect(actor?.anonId).toBe('anon-1');
            expect(actor?.createdCount).toBe(0);
            expect(actor?.firstSeenAt).toBeInstanceOf(Date);
            expect(actor?.lastSeenAt).toBeInstanceOf(Date);
            expect(actor?.lastIpAddrHash).toBe('hash-1');
        });

        it('Should update ip hash without changing firstSeenAt or createdCount', async () => {
            // Arrange
            await upsertAnonActor('anon-1', 'hash-1');
            const before = await prisma.anonActor.findUnique({
                where: { anonId: 'anon-1' },
            });

            // Act
            await upsertAnonActor('anon-1', 'hash-2');

            // Assert
            const after = await prisma.anonActor.findUnique({
                where: { anonId: 'anon-1' },
            });

            expect(after).not.toBeNull();
            expect(after?.anonId).toBe('anon-1');
            expect(after?.createdCount).toBe(0);
            expect(after?.firstSeenAt.toISOString()).toBe(before?.firstSeenAt.toISOString());
            expect(after?.lastIpAddrHash).toBe('hash-2');
        });

        it('Should handle concurrent upserts for the same anonId', async () => {
            // Act
            await Promise.all(
                Array(5)
                    .fill(null)
                    .map(() => upsertAnonActor('anon-1', 'hash-1')),
            );

            // Assert
            const actors = await prisma.anonActor.findMany({
                where: { anonId: 'anon-1' },
            });

            expect(actors).toHaveLength(1);
        });
    });

    describe('Increment anonymous quota count (transactional)', () => {
        it('Should increment createdCount and return true when under limit', async () => {
            await upsertAnonActor('anon-quota-ok', 'hash-1');

            const succeeded = await prisma.$transaction((tx) => incrementAnonActorQuotaCountTx('anon-quota-ok', 2, tx));

            expect(succeeded).toBe(true);

            const actor = await prisma.anonActor.findUnique({
                where: { anonId: 'anon-quota-ok' },
            });
            expect(actor?.createdCount).toBe(1);
        });

        it('Should return false and not increment when actor is already at limit', async () => {
            await prisma.anonActor.create({
                data: {
                    anonId: 'anon-quota-maxed',
                    createdCount: 1,
                },
            });

            const succeeded = await prisma.$transaction((tx) =>
                incrementAnonActorQuotaCountTx('anon-quota-maxed', 1, tx),
            );

            expect(succeeded).toBe(false);

            const actor = await prisma.anonActor.findUnique({
                where: { anonId: 'anon-quota-maxed' },
            });
            expect(actor?.createdCount).toBe(1);
        });

        it('Should return false when actor does not exist', async () => {
            const succeeded = await prisma.$transaction((tx) => incrementAnonActorQuotaCountTx('missing-actor', 3, tx));

            expect(succeeded).toBe(false);
            expect(await prisma.anonActor.count()).toBe(0);
        });

        it('Should roll back increment when outer transaction fails', async () => {
            await upsertAnonActor('anon-tx-rollback', 'hash-1');

            await expect(
                prisma.$transaction(async (tx) => {
                    const succeeded = await incrementAnonActorQuotaCountTx('anon-tx-rollback', 5, tx);
                    expect(succeeded).toBe(true);
                    throw new Error('force rollback');
                }),
            ).rejects.toThrow('force rollback');

            const actor = await prisma.anonActor.findUnique({
                where: { anonId: 'anon-tx-rollback' },
            });
            expect(actor?.createdCount).toBe(0);
        });
    });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { upsertAnonActor } from '@/dal/anon_actors/anon_actors.repo';
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
});

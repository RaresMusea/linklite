import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { pingDb } from '@/dal/db/db.repo';

describe('Database repository integration tests', () => {
    beforeAll(async () => {
        await prisma.$connect();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe('pingDb', () => {
        it('Should resolve when the database is reachable', async () => {
            await expect(pingDb()).resolves.toBeUndefined();
        });
    });
});

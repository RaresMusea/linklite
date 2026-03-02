import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { resetDb } from '@/tests/helpers/db';

const mocks = vi.hoisted(() => {
    const state = {
        currentAnonCookie: undefined as string | undefined,
    };
    const mockCookieSet = vi.fn();
    const mockCookies = vi.fn(async () => ({
        get: (name: string) =>
            name === 'anon_id' && state.currentAnonCookie ? { value: state.currentAnonCookie } : undefined,
        set: mockCookieSet,
    }));

    return {
        state,
        mockCookieSet,
        mockCookies,
    };
});

vi.mock('next/headers', () => ({
    cookies: mocks.mockCookies,
}));

import { getOrCreateAnonActor } from '@/dal/anon_actors/anon_actors.service';

describe('getOrCreateAnonActor integration tests', () => {
    beforeEach(async () => {
        await resetDb();
        vi.clearAllMocks();
        vi.unstubAllEnvs();
        mocks.state.currentAnonCookie = undefined;
    });

    it('Uses existing anon_id cookie and upserts actor with provided ip hash', async () => {
        // Arrange
        mocks.state.currentAnonCookie = 'anon-existing';

        // Act
        const result = await getOrCreateAnonActor('hashed-ip');

        // Assert
        expect(result.isNewCookie).toBe(false);
        expect(result.quota).toEqual({
            anonId: 'anon-existing',
            createdCount: 0,
        });
        expect(mocks.mockCookieSet).not.toHaveBeenCalled();

        const actor = await prisma.anonActor.findUnique({
            where: { anonId: 'anon-existing' },
        });

        expect(actor?.lastIpAddrHash).toBe('hashed-ip');
    });

    it('Creates anon_id cookie when missing and stores actor', async () => {
        // Arrange
        // Act
        const result = await getOrCreateAnonActor(null);

        // Assert
        expect(result.isNewCookie).toBe(true);
        expect(mocks.mockCookieSet).toHaveBeenCalledTimes(1);

        const cookieArg = mocks.mockCookieSet.mock.calls[0][0];
        expect(cookieArg.name).toBe('anon_id');
        expect(cookieArg.value).toEqual(expect.any(String));

        const actor = await prisma.anonActor.findUnique({
            where: { anonId: cookieArg.value },
        });

        expect(actor).not.toBeNull();
        expect(result.quota).toEqual({
            anonId: cookieArg.value,
            createdCount: 0,
        });
    });

    it('Returns existing createdCount when actor already exists', async () => {
        // Arrange
        mocks.state.currentAnonCookie = 'anon-with-usage';

        await prisma.anonActor.create({
            data: {
                anonId: 'anon-with-usage',
                createdCount: 3,
                lastIpAddrHash: 'old-hash',
            },
        });

        // Act
        const result = await getOrCreateAnonActor('new-hash');

        // Assert
        expect(result.isNewCookie).toBe(false);
        expect(result.quota).toEqual({
            anonId: 'anon-with-usage',
            createdCount: 3,
        });

        const actor = await prisma.anonActor.findUnique({
            where: { anonId: 'anon-with-usage' },
        });
        expect(actor?.lastIpAddrHash).toBe('new-hash');
    });
});

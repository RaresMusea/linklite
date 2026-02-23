import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { resetDb } from '@/tests/helpers/db';

const mocks = vi.hoisted(() => {
    const state = {
        currentAnonCookie: undefined as string | undefined,
        currentHeaders: new Headers(),
    };
    const mockCookieSet = vi.fn();
    const mockCookies = vi.fn(async () => ({
        get: (name: string) =>
            name === 'anon_id' && state.currentAnonCookie ? { value: state.currentAnonCookie } : undefined,
        set: mockCookieSet,
    }));
    const mockHeaders = vi.fn(async () => state.currentHeaders);

    return {
        state,
        mockCookieSet,
        mockCookies,
        mockHeaders,
    };
});

vi.mock('next/headers', () => ({
    cookies: mocks.mockCookies,
    headers: mocks.mockHeaders,
}));

import { getOrCreateAnonActor } from '@/dal/anon_actors/anon_actors.service';

describe('getOrCreateAnonActor integration tests', () => {
    beforeEach(async () => {
        await resetDb();
        vi.clearAllMocks();
        vi.unstubAllEnvs();
        mocks.state.currentAnonCookie = undefined;
        mocks.state.currentHeaders = new Headers();
        vi.stubEnv('IP_HASH_SALT', 'integration-test-salt');
    });

    it('Uses existing anon_id cookie and upserts actor with hashed ip', async () => {
        // Arrange
        mocks.state.currentAnonCookie = 'anon-existing';
        mocks.state.currentHeaders = new Headers({ 'x-forwarded-for': '1.2.3.4' });

        // Act
        const result = await getOrCreateAnonActor();

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

        const expectedHash = createHash('sha256').update('1.2.3.4:integration-test-salt').digest('hex');
        expect(actor?.lastIpAddrHash).toBe(expectedHash);
    });

    it('Creates anon_id cookie when missing and stores actor', async () => {
        // Arrange
        mocks.state.currentHeaders = new Headers({ 'x-forwarded-for': '5.6.7.8' });

        // Act
        const result = await getOrCreateAnonActor();

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

        mocks.state.currentHeaders = new Headers({ 'x-forwarded-for': '9.9.9.9' });

        // Act
        const result = await getOrCreateAnonActor();

        // Assert
        expect(result.isNewCookie).toBe(false);
        expect(result.quota).toEqual({
            anonId: 'anon-with-usage',
            createdCount: 3,
        });
    });
});

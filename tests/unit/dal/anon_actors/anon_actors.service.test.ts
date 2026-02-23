import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    mockCookieGet: vi.fn(),
    mockCookieSet: vi.fn(),
    mockHeaders: vi.fn(),
    mockCookies: vi.fn(),
    mockGetClientIp: vi.fn(),
    mockHashIp: vi.fn(),
    mockUpsertAnonActor: vi.fn(),
    mockToAnonActorQuota: vi.fn(),
}));

vi.mock('next/headers', () => ({
    cookies: mocks.mockCookies,
    headers: mocks.mockHeaders,
}));

vi.mock('@/lib/network/ip', () => ({
    getClientIp: mocks.mockGetClientIp,
    hashIp: mocks.mockHashIp,
}));

vi.mock('@/dal/anon_actors/anon_actors.repo', () => ({
    upsertAnonActor: mocks.mockUpsertAnonActor,
}));

vi.mock('@/dal/anon_actors/anon_actors.types', () => ({
    toAnonActorQuota: mocks.mockToAnonActorQuota,
}));

import { getOrCreateAnonActor } from '@/dal/anon_actors/anon_actors.service';

describe('getOrCreateAnonActor unit tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();

        mocks.mockCookies.mockResolvedValue({
            get: mocks.mockCookieGet,
            set: mocks.mockCookieSet,
        });
    });

    it('Uses existing anon_id cookie and does not set a new one', async () => {
        // Arrange
        mocks.mockCookieGet.mockReturnValue({ value: 'anon-existing' });
        mocks.mockHeaders.mockResolvedValue(new Headers({ 'x-forwarded-for': '1.2.3.4' }));
        mocks.mockGetClientIp.mockReturnValue('1.2.3.4');
        mocks.mockHashIp.mockReturnValue('hashed-ip');
        mocks.mockUpsertAnonActor.mockResolvedValue({ anonId: 'anon-existing', createdCount: 2 });
        mocks.mockToAnonActorQuota.mockReturnValue({ anonId: 'anon-existing', createdCount: 2 });

        // Act
        const result = await getOrCreateAnonActor();

        // Assert
        expect(mocks.mockCookieSet).not.toHaveBeenCalled();
        expect(mocks.mockUpsertAnonActor).toHaveBeenCalledWith('anon-existing', 'hashed-ip');
        expect(result).toEqual({
            isNewCookie: false,
            quota: { anonId: 'anon-existing', createdCount: 2 },
        });
    });

    it('Creates anon_id cookie when missing and persists actor with null hash when ip is missing', async () => {
        // Arrange
        mocks.mockCookieGet.mockReturnValue(undefined);
        mocks.mockHeaders.mockResolvedValue(new Headers());
        mocks.mockGetClientIp.mockReturnValue(null);
        mocks.mockHashIp.mockReturnValue(null);
        mocks.mockUpsertAnonActor.mockResolvedValue({ anonId: 'generated-id', createdCount: 0 });
        mocks.mockToAnonActorQuota.mockReturnValue({ anonId: 'generated-id', createdCount: 0 });

        // Act
        const result = await getOrCreateAnonActor();

        // Assert
        expect(mocks.mockCookieSet).toHaveBeenCalledTimes(1);
        const cookieArgs = mocks.mockCookieSet.mock.calls[0][0];
        expect(cookieArgs.name).toBe('anon_id');
        expect(cookieArgs.value).toEqual(expect.any(String));
        expect(cookieArgs.httpOnly).toBe(true);
        expect(cookieArgs.sameSite).toBe('lax');
        expect(cookieArgs.secure).toBe(false);
        expect(cookieArgs.path).toBe('/');
        expect(cookieArgs.maxAge).toBe(60 * 60 * 24 * 30);

        expect(mocks.mockUpsertAnonActor).toHaveBeenCalledWith(cookieArgs.value, null);
        expect(result).toEqual({
            isNewCookie: true,
            quota: { anonId: 'generated-id', createdCount: 0 },
        });
    });

    it('Sets secure cookie in production', async () => {
        // Arrange
        vi.stubEnv('NODE_ENV', 'production');

        mocks.mockCookieGet.mockReturnValue(undefined);
        mocks.mockHeaders.mockResolvedValue(new Headers());
        mocks.mockGetClientIp.mockReturnValue(null);
        mocks.mockHashIp.mockReturnValue(null);
        mocks.mockUpsertAnonActor.mockResolvedValue({ anonId: 'generated-id', createdCount: 0 });
        mocks.mockToAnonActorQuota.mockReturnValue({ anonId: 'generated-id', createdCount: 0 });

        try {
            // Act
            await getOrCreateAnonActor();
        } finally {
            vi.unstubAllEnvs();
        }

        // Assert
        const cookieArgs = mocks.mockCookieSet.mock.calls[0][0];
        expect(cookieArgs.secure).toBe(true);
    });
});

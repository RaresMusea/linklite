import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    getAppOrigin: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
}));

vi.mock('@/lib/origin', () => ({
    getAppOrigin: mocks.getAppOrigin,
}));

vi.mock('@/lib/logging/logger', () => ({
    logger: {
        component: vi.fn(() => ({
            child: vi.fn(() => ({
                info: mocks.info,
                error: mocks.error,
            })),
        })),
    },
}));

import { verifyEmailToken } from '@/lib/auth/email-verify';

describe('verifyEmailToken', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('Returns invalid when token is missing', async () => {
        const result = await verifyEmailToken();

        expect(result).toBe('invalid');
        expect(mocks.getAppOrigin).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('Returns invalid when app origin is missing', async () => {
        mocks.getAppOrigin.mockReturnValueOnce(null);

        const result = await verifyEmailToken('abc-token');

        expect(result).toBe('invalid');
        expect(fetch).not.toHaveBeenCalled();
    });

    it('Returns success when Better Auth verify endpoint responds with ok', async () => {
        mocks.getAppOrigin.mockReturnValueOnce('https://app.linklite.dev');
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
        } as Response);

        const result = await verifyEmailToken('abc-token');

        expect(result).toBe('success');
        expect(fetch).toHaveBeenCalledWith('https://app.linklite.dev/api/auth/verify-email?token=abc-token', {
            method: 'GET',
            headers: { accept: 'application/json' },
            cache: 'no-store',
        });
    });

    it('Returns expired when Better Auth responds with TOKEN_EXPIRED', async () => {
        mocks.getAppOrigin.mockReturnValueOnce('https://app.linklite.dev');
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
            json: vi.fn().mockResolvedValue({ code: 'TOKEN_EXPIRED' }),
        } as unknown as Response);

        const result = await verifyEmailToken('abc-token');

        expect(result).toBe('expired');
    });

    it('Returns invalid when Better Auth responds with non-expired error code', async () => {
        mocks.getAppOrigin.mockReturnValueOnce('https://app.linklite.dev');
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
            json: vi.fn().mockResolvedValue({ code: 'INVALID_TOKEN' }),
        } as unknown as Response);

        const result = await verifyEmailToken('abc-token');

        expect(result).toBe('invalid');
    });

    it('Returns invalid when error payload cannot be parsed', async () => {
        mocks.getAppOrigin.mockReturnValueOnce('https://app.linklite.dev');
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
            json: vi.fn().mockRejectedValue(new Error('bad json')),
        } as unknown as Response);

        const result = await verifyEmailToken('abc-token');

        expect(result).toBe('invalid');
    });

    it('Returns invalid when fetch throws', async () => {
        mocks.getAppOrigin.mockReturnValueOnce('https://app.linklite.dev');
        vi.mocked(fetch).mockRejectedValueOnce(new Error('network down'));

        const result = await verifyEmailToken('abc-token');

        expect(result).toBe('invalid');
        expect(mocks.error).toHaveBeenCalledTimes(1);
    });
});

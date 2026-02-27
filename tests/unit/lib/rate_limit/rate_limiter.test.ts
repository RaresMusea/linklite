import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { withRedisMock } = vi.hoisted(() => ({
    withRedisMock: vi.fn(),
}));

vi.mock('@/lib/redis/redis', () => ({
    withRedis: withRedisMock,
}));

import { checkShortenIpRateLimit } from '@/lib/rate_limit/rate_limiter';

describe('Rate limiter tests', () => {
    const ORIGINAL_MAX = process.env.RATE_LIMIT_MAX_REQUESTS;
    const ORIGINAL_WINDOW = process.env.RATE_LIMIT_WINDOW_SECONDS;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.RATE_LIMIT_MAX_REQUESTS = '3';
        process.env.RATE_LIMIT_WINDOW_SECONDS = '60';
    });

    afterEach(() => {
        vi.restoreAllMocks();

        if (ORIGINAL_MAX === undefined) {
            delete process.env.RATE_LIMIT_MAX_REQUESTS;
        } else {
            process.env.RATE_LIMIT_MAX_REQUESTS = ORIGINAL_MAX;
        }

        if (ORIGINAL_WINDOW === undefined) {
            delete process.env.RATE_LIMIT_WINDOW_SECONDS;
        } else {
            process.env.RATE_LIMIT_WINDOW_SECONDS = ORIGINAL_WINDOW;
        }
    });

    it('Allows requests within limit and sets expiry on first increment', async () => {
        const incr = vi.fn().mockResolvedValue(1);
        const expire = vi.fn().mockResolvedValue(1);
        const nowMs = 65_000;
        vi.spyOn(Date, 'now').mockReturnValue(nowMs);

        withRedisMock.mockImplementation(async (fn) => fn({ incr, expire }));

        const result = await checkShortenIpRateLimit({ ipHash: 'abc' });

        expect(result).toEqual({ ok: true, remaining: 2 });
        expect(incr).toHaveBeenCalledWith('rl:shorten:ip:abc:1');
        expect(expire).toHaveBeenCalledWith('rl:shorten:ip:abc:1', 62);
    });

    it('Does not reset expiry when key already exists', async () => {
        const incr = vi.fn().mockResolvedValue(2);
        const expire = vi.fn().mockResolvedValue(1);
        vi.spyOn(Date, 'now').mockReturnValue(65_000);

        withRedisMock.mockImplementation(async (fn) => fn({ incr, expire }));

        const result = await checkShortenIpRateLimit({ ipHash: 'abc' });

        expect(result).toEqual({ ok: true, remaining: 1 });
        expect(expire).not.toHaveBeenCalled();
    });

    it('Returns retryAfterSec when limit is exceeded', async () => {
        const incr = vi.fn().mockResolvedValue(4);
        const expire = vi.fn().mockResolvedValue(1);
        vi.spyOn(Date, 'now').mockReturnValue(65_500);

        withRedisMock.mockImplementation(async (fn) => fn({ incr, expire }));

        const result = await checkShortenIpRateLimit({ ipHash: 'abc' });

        expect(result).toEqual({ ok: false, retryAfterSec: 55 });
    });

    it('Supports per-call limit/window overrides', async () => {
        const incr = vi.fn().mockResolvedValue(1);
        const expire = vi.fn().mockResolvedValue(1);
        vi.spyOn(Date, 'now').mockReturnValue(100_000);

        withRedisMock.mockImplementation(async (fn) => fn({ incr, expire }));

        const result = await checkShortenIpRateLimit({ ipHash: 'abc', limit: 2, windowSec: 10 });

        expect(result).toEqual({ ok: true, remaining: 1 });
        expect(incr).toHaveBeenCalledWith('rl:shorten:ip:abc:10');
        expect(expire).toHaveBeenCalledWith('rl:shorten:ip:abc:10', 12);
    });

    it('Returns null when redis layer is fail-open', async () => {
        withRedisMock.mockResolvedValue(null);

        const result = await checkShortenIpRateLimit({ ipHash: 'abc' });

        expect(result).toBeNull();
    });
});

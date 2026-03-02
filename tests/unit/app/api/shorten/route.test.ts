import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/shorten/route';
import { generateSlug } from '@/lib/utils';
import { getOrCreateAnonActor } from '@/dal/anon_actors/anon_actors.service';
import { createAnonLinkWithQuota } from '@/dal/links/links.service';
import { QuotaExceededError } from '@/lib/errors/QuotaExceededError';
import { checkShortenIpRateLimit } from '@/lib/rate_limit/rate_limiter';
import { getClientIp, hashIp } from '@/lib/network/ip';

vi.mock('@/lib/utils', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/utils')>();
    return {
        ...actual,
        generateSlug: vi.fn(),
    };
});

vi.mock('@/dal/anon_actors/anon_actors.service', () => ({
    getOrCreateAnonActor: vi.fn(),
}));

vi.mock('@/dal/links/links.service', () => ({
    createAnonLinkWithQuota: vi.fn(),
}));

vi.mock('@/lib/rate_limit/rate_limiter', () => ({
    checkShortenIpRateLimit: vi.fn(),
}));

vi.mock('@/lib/network/ip', () => ({
    getClientIp: vi.fn(),
    hashIp: vi.fn(),
}));

function req(body: unknown): NextRequest {
    return new NextRequest('http://localhost:3000/api/shorten', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            host: 'localhost:3000',
            'x-forwarded-proto': 'http',
        },
        body: JSON.stringify(body),
    });
}

type PrismaLikeError = Error & { code?: string };

describe('POST /api/shorten (unit tests)', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(getOrCreateAnonActor).mockResolvedValue({
            isNewCookie: false,
            quota: {
                anonId: 'anon-unit',
                createdCount: 0,
            },
        });
        vi.mocked(checkShortenIpRateLimit).mockResolvedValue({
            ok: true,
            remaining: 9,
        });
        vi.mocked(getClientIp).mockReturnValue('1.2.3.4');
        vi.mocked(hashIp).mockReturnValue('hashed-ip');
    });

    it('Returns 429 when request is rate limited', async () => {
        vi.mocked(checkShortenIpRateLimit).mockResolvedValueOnce({
            ok: false,
            retryAfterSec: 42,
        });

        const res = await POST(req({ url: 'https://example.com' }) as never);

        expect(res.status).toBe(429);
        expect(res.headers.get('Retry-After')).toBe('42');

        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.code).toBe('RATE_LIMITED');
        expect(json.error).toBe('Too many requests');

        expect(vi.mocked(checkShortenIpRateLimit)).toHaveBeenCalledWith({ ipHash: 'hashed-ip' });
        expect(vi.mocked(createAnonLinkWithQuota)).not.toHaveBeenCalled();
    });

    it('Skips rate limiting when client ip is unavailable', async () => {
        vi.mocked(getClientIp).mockReturnValueOnce(null);

        const res = await POST(req({ url: 'not-a-valid-url' }) as never);

        expect(res.status).toBe(400);
        expect(vi.mocked(checkShortenIpRateLimit)).not.toHaveBeenCalled();
    });

    it('Skips rate limiting and passes null ipHash when hashIp returns null', async () => {
        vi.mocked(hashIp).mockReturnValueOnce(null);
        vi.mocked(generateSlug).mockReturnValueOnce('abc123');
        vi.mocked(createAnonLinkWithQuota).mockResolvedValueOnce({
            id: '1',
            domainId: '2',
            slug: 'abc123',
            targetUrl: 'https://example.com',
            ownerId: null,
        });

        const res = await POST(req({ url: 'https://example.com' }) as never);

        expect(res.status).toBe(201);
        expect(vi.mocked(checkShortenIpRateLimit)).not.toHaveBeenCalled();
        expect(vi.mocked(getOrCreateAnonActor)).toHaveBeenCalledWith(null);
    });

    it('Returns 400 with first validation issue for invalid URL format', async () => {
        const res = await POST(req({ url: 'not-a-valid-url' }) as never);

        expect(res.status).toBe(400);

        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.code).toBe('VALIDATION_ERROR');
        expect(json.error).toBe('Invalid URL format!');
        expect(json.error.startsWith('[')).toBe(false);
    });

    it('Returns 400 with code VALIDATION_ERROR when body is invalid', async () => {
        const res = await POST(req({}) as never);

        expect(res.status).toBe(400);

        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.code).toBe('VALIDATION_ERROR');
        expect(typeof json.error).toBe('string');
        expect(json.error.length).toBeGreaterThan(0);
        expect(json.error.startsWith('[')).toBe(false);
    });

    it('Creates link and returns shortUrl', async () => {
        vi.mocked(generateSlug).mockReturnValueOnce('abc123');

        vi.mocked(createAnonLinkWithQuota).mockResolvedValueOnce({
            id: '1',
            domainId: '2',
            slug: 'abc123',
            targetUrl: 'https://example.com',
            ownerId: null,
        });

        const res = await POST(req({ url: 'https://example.com' }) as never);

        expect(res.status).toBe(201);

        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.created.slug).toBe('abc123');
        expect(json.data.shortUrl).toBe('http://localhost:3000/abc123');

        expect(vi.mocked(createAnonLinkWithQuota)).toHaveBeenCalledWith(
            {
                ownerId: null,
                slug: 'abc123',
                targetUrl: 'https://example.com',
            },
            'anon-unit',
            5,
        );
    });

    it('Retries on P2002 and succeeds on next attempt', async () => {
        vi.mocked(generateSlug).mockReturnValueOnce('dup').mockReturnValueOnce('ok');

        const p2002: PrismaLikeError = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });

        vi.mocked(createAnonLinkWithQuota).mockRejectedValueOnce(p2002).mockResolvedValueOnce({
            id: '2',
            domainId: '2',
            slug: 'ok',
            targetUrl: 'https://example.com',
            ownerId: null,
        });

        const res = await POST(req({ url: 'https://example.com' }) as never);

        expect(res.status).toBe(201);
        expect(vi.mocked(createAnonLinkWithQuota).mock.calls.length).toBe(2);

        const json = await res.json();
        expect(json.data.created.slug).toBe('ok');
        expect(json.data.shortUrl).toBe('http://localhost:3000/ok');
    });

    it('Returns 500 if slug collision happens 5 times', async () => {
        vi.mocked(generateSlug)
            .mockReturnValueOnce('s1')
            .mockReturnValueOnce('s2')
            .mockReturnValueOnce('s3')
            .mockReturnValueOnce('s4')
            .mockReturnValueOnce('s5');

        const p2002: PrismaLikeError = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });

        vi.mocked(createAnonLinkWithQuota).mockRejectedValue(p2002);

        const res = await POST(req({ url: 'https://example.com' }) as never);

        expect(res.status).toBe(500);

        const json = await res.json();
        expect(json.code).toBe('SLUG_EXHAUSTED');
        expect(json.error).toContain('Could not generate a unique slug');
        expect(vi.mocked(createAnonLinkWithQuota).mock.calls.length).toBe(5);
    });

    it('Returns 429 when quota is exceeded', async () => {
        vi.mocked(generateSlug).mockReturnValueOnce('abc123');
        vi.mocked(createAnonLinkWithQuota).mockRejectedValueOnce(new QuotaExceededError(5));

        const res = await POST(req({ url: 'https://example.com' }) as never);

        expect(res.status).toBe(429);

        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.code).toBe('QUOTA_EXCEEDED');
        expect(json.error).toContain('anonymous limit');
    });

    it('Returns 500 on non-P2002 unknown errors', async () => {
        vi.mocked(generateSlug).mockReturnValueOnce('abc123');
        vi.mocked(createAnonLinkWithQuota).mockRejectedValueOnce(new Error('DB down'));

        const res = await POST(req({ url: 'https://example.com' }) as never);

        expect(res.status).toBe(500);

        const json = await res.json();
        expect(json.code).toBe('INTERNAL');
        expect(json.error).toContain('Internal server error');
    });
});

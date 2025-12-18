import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { CreateLinkInput, CreatedLink } from '@/dal/links/links.types';

type CreateLinkFn = (input: CreateLinkInput) => Promise<CreatedLink>;
type GenerateSlugFn = (input: number) => string;

vi.mock('@/dal/links/links.repo', () => ({
    createLink: vi.fn<CreateLinkFn>(),
}));

vi.mock('@/lib/utils', () => ({
    generateSlug: vi.fn<GenerateSlugFn>(),
}));

import { createLink } from '@/dal/links/links.repo';
import { generateSlug } from '@/lib/utils';
import { POST } from '@/app/api/shorten/route';

function req(body: unknown): Request {
    return new Request('http://localhost/api/shorten', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
}

// Keep this small: we only need the `code` field for P2002 detection
type PrismaLikeError = Error & { code?: string };

describe('POST /api/shorten', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Ensure stable shortUrl generation in tests unless you override it
        process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    });

    it('returns 400 on invalid body', async () => {
        const res = await POST(req({}) as never); // cast only at the framework boundary
        expect(res.status).toBe(400);

        const json = await res.json();
        expect(json.error).toBe('Validation error');
    });

    it('creates link and returns shortUrl', async () => {
        vi.mocked(generateSlug).mockReturnValueOnce('abc123');

        vi.mocked(createLink).mockResolvedValueOnce({
            id: '1',
            slug: 'abc123',
            targetUrl: 'https://example.com',
            ownerId: null,
        });

        const res = await POST(req({ url: 'https://example.com' }) as never);
        expect(res.status).toBe(201);

        const json = await res.json();
        expect(json.success).toBe(true);

        // created link payload
        expect(json.data.created).toEqual({
            id: '1',
            slug: 'abc123',
            targetUrl: 'https://example.com',
            ownerId: null,
        });

        // shortUrl
        expect(json.data.shortUrl).toBe('http://localhost:3000/abc123');

        // repo called with expected input
        expect(vi.mocked(createLink)).toHaveBeenCalledWith({
            ownerId: null,
            slug: 'abc123',
            targetUrl: 'https://example.com',
        });
    });

    it('retries on P2002 (slug collision) and succeeds on next attempt', async () => {
        vi.mocked(generateSlug).mockReturnValueOnce('dup').mockReturnValueOnce('ok');

        const p2002: PrismaLikeError = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });

        vi.mocked(createLink).mockRejectedValueOnce(p2002).mockResolvedValueOnce({
            id: '2',
            slug: 'ok',
            targetUrl: 'https://example.com',
            ownerId: null,
        });

        const res = await POST(req({ url: 'https://example.com' }) as never);
        expect(res.status).toBe(201);

        // should have tried twice
        expect(vi.mocked(createLink).mock.calls.length).toBe(2);

        const json = await res.json();
        expect(json.data.created.slug).toBe('ok');
        expect(json.data.shortUrl).toBe('http://localhost:3000/ok');
    });

    it('returns 500 if slug collision happens 5 times', async () => {
        vi.mocked(generateSlug)
            .mockReturnValueOnce('s1')
            .mockReturnValueOnce('s2')
            .mockReturnValueOnce('s3')
            .mockReturnValueOnce('s4')
            .mockReturnValueOnce('s5');

        const p2002: PrismaLikeError = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });

        vi.mocked(createLink).mockRejectedValue(p2002); // all attempts collide

        const res = await POST(req({ url: 'https://example.com' }) as never);
        expect(res.status).toBe(500);

        const json = await res.json();
        expect(json.error).toContain('Could not generate a unique slug');

        expect(vi.mocked(createLink).mock.calls.length).toBe(5);
    });

    it('returns 500 on non-P2002 errors', async () => {
        vi.mocked(generateSlug).mockReturnValueOnce('abc123');
        vi.mocked(createLink).mockRejectedValueOnce(new Error('DB down'));

        const res = await POST(req({ url: 'https://example.com' }) as never);
        expect(res.status).toBe(500);

        const json = await res.json();
        expect(json.error).toContain('internal error');
    });
});

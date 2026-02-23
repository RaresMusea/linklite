import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/shorten/route';
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

function req(body: unknown): NextRequest {
    return new NextRequest('http://localhost:3000/api/shorten', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            host: 'localhost:3000',
            'x-forwarded-proto': 'http',
            'x-forwarded-for': '1.2.3.4',
        },
        body: JSON.stringify(body),
    });
}

describe('POST /api/shorten integration tests', () => {
    beforeEach(async () => {
        await resetDb();
        vi.clearAllMocks();
        vi.unstubAllEnvs();

        mocks.state.currentAnonCookie = undefined;
        mocks.state.currentHeaders = new Headers({ 'x-forwarded-for': '1.2.3.4' });

        vi.stubEnv('IP_HASH_SALT', 'integration-test-salt');
    });

    it('Returns 400 with a human-readable message for invalid URL format', async () => {
        const res = await POST(req({ url: 'not-a-valid-url' }));

        expect(res.status).toBe(400);

        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.code).toBe('VALIDATION_ERROR');
        expect(json.error).toBe('Invalid URL format!');
        expect(json.error.startsWith('[')).toBe(false);
        expect(json.details).toBeDefined();
    });

    it('Returns 400 with code VALIDATION_ERROR when required url is missing', async () => {
        const res = await POST(req({}));

        expect(res.status).toBe(400);

        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.code).toBe('VALIDATION_ERROR');
        expect(typeof json.error).toBe('string');
        expect(json.error.length).toBeGreaterThan(0);
        expect(json.error.startsWith('[')).toBe(false);
    });

    it('Creates a link for a valid URL and returns shortUrl', async () => {
        mocks.state.currentAnonCookie = 'anon-integration-route';

        await prisma.anonActor.create({
            data: {
                anonId: 'anon-integration-route',
                createdCount: 0,
            },
        });

        const res = await POST(req({ url: 'https://example.com/path' }));

        expect(res.status).toBe(201);

        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.shortUrl).toMatch(/^http:\/\/localhost:3000\//);
        expect(json.data.created.targetUrl).toBe('https://example.com/path');

        const createdSlug = json.data.created.slug as string;
        const link = await prisma.link.findUnique({ where: { slug: createdSlug } });
        expect(link).not.toBeNull();

        const actor = await prisma.anonActor.findUnique({ where: { anonId: 'anon-integration-route' } });
        expect(actor?.createdCount).toBe(1);
    });

    it('Returns 429 when anon quota is exceeded', async () => {
        mocks.state.currentAnonCookie = 'anon-over-limit';

        await prisma.anonActor.create({
            data: {
                anonId: 'anon-over-limit',
                createdCount: 5,
            },
        });

        const res = await POST(req({ url: 'https://example.com/too-many' }));

        expect(res.status).toBe(429);

        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.code).toBe('QUOTA_EXCEEDED');
        expect(typeof json.error).toBe('string');
        expect(json.error).toContain('anonymous limit');

        expect(await prisma.link.count()).toBe(0);

        const actor = await prisma.anonActor.findUnique({ where: { anonId: 'anon-over-limit' } });
        expect(actor?.createdCount).toBe(5);
    });
});

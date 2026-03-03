import { beforeEach, describe, expect, it, vi } from 'vitest';

import { shortenUrl } from '@/http/shorten';
import * as guards from '@/lib/guards';
import * as utils from '@/lib/utils';

describe('URL shorten HTTP client unit tests', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('Returns shortUrl on successful API response', async () => {
        const fetchMock = vi.fn(async () => ({
            ok: true,
            json: async () => ({
                success: true,
                data: {
                    created: {
                        id: '1',
                        domainId: null,
                        slug: 'abc',
                        targetUrl: 'https://example.com',
                        ownerId: null,
                    },
                    shortUrl: 'https://short.ly/abc',
                },
            }),
        }));

        vi.stubGlobal('fetch', fetchMock as never);

        const result = await shortenUrl('https://example.com');

        expect(result).toBe('https://short.ly/abc');
        expect(fetchMock).toHaveBeenCalledWith('/api/shorten', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'https://example.com' }),
        });
    });

    it('Throws API error with code and retryAfterSec when available', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: false,
                headers: {
                    get: vi.fn((name: string) => (name === 'Retry-After' ? '15' : null)),
                },
                json: async () => ({
                    success: false,
                    error: 'Too many requests',
                    code: 'RATE_LIMITED',
                }),
            })) as never
        );

        try {
            await shortenUrl('https://example.com');
            throw new Error('Expected shortenUrl to throw');
        } catch (err) {
            const apiErr = err as Error & { code?: string; retryAfterSec?: number };
            expect(apiErr.message).toBe('Too many requests');
            expect(apiErr.code).toBe('RATE_LIMITED');
            expect(apiErr.retryAfterSec).toBe(15);
        }
    });

    it('Throws API error without optional metadata when headers are missing', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: false,
                json: async () => ({
                    success: false,
                    error: 'Bad request',
                }),
            })) as never
        );

        try {
            await shortenUrl('https://example.com');
            throw new Error('Expected shortenUrl to throw');
        } catch (err) {
            const apiErr = err as Error & { code?: string; retryAfterSec?: number };
            expect(apiErr.message).toBe('Bad request');
            expect(apiErr.code).toBeUndefined();
            expect(apiErr.retryAfterSec).toBeUndefined();
        }
    });

    it('Throws generic failure when response is not a valid error object', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: false,
                json: async () => 'unexpected-shape',
            })) as never
        );

        await expect(shortenUrl('https://example.com')).rejects.toThrow('Failed to shorten URL. Please try again.');
    });

    it('Throws unexpected response when payload is not ApiRouteResponse', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: true,
                json: async () => ({ success: true, data: { nope: true } }),
            })) as never
        );

        await expect(shortenUrl('https://example.com')).rejects.toThrow('Unexpected response from server.');
    });

    it('Throws API error from final guard branch when forced through mocked guards', async () => {
        vi.spyOn(guards, 'isPlainObject').mockReturnValue(false);
        vi.spyOn(utils, 'isApiRouteResponseOf').mockReturnValue(true);

        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: true,
                headers: {},
                json: async () => ({ success: false, error: 'Forced error' }),
            })) as never
        );

        await expect(shortenUrl('https://example.com')).rejects.toThrow('Forced error');
    });

    it('Uses fallback message in final guard branch when error is missing', async () => {
        vi.spyOn(guards, 'isPlainObject').mockReturnValue(false);
        vi.spyOn(utils, 'isApiRouteResponseOf').mockReturnValue(true);

        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: true,
                headers: {},
                json: async () => ({ success: false }),
            })) as never
        );

        await expect(shortenUrl('https://example.com')).rejects.toThrow('Failed to shorten URL. Please try again.');
    });
});

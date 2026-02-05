import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isPrivateHost, probeRedirect } from '@/lib/redirect_safety/redirect_probe';

describe('Is private host', () => {
    it('Should return true for private IPv4 ranges', () => {
        expect(isPrivateHost('10.0.0.1')).toBe(true);
        expect(isPrivateHost('172.16.0.1')).toBe(true);
        expect(isPrivateHost('192.168.1.1')).toBe(true);
    });

    it('Should return true for loopback and link-local addresses', () => {
        expect(isPrivateHost('127.0.0.1')).toBe(true);
        expect(isPrivateHost('169.254.10.20')).toBe(true);
    });

    it('Should return false for public IPv4 addresses', () => {
        expect(isPrivateHost('8.8.8.8')).toBe(false);
        expect(isPrivateHost('1.1.1.1')).toBe(false);
    });

    it('Should return true for private/loopback IPv6 addresses', () => {
        expect(isPrivateHost('::1')).toBe(true);
        expect(isPrivateHost('fd00::1')).toBe(true);
        expect(isPrivateHost('fe80::1')).toBe(true);
    });

    it('Should return false for public IPv6 addresses', () => {
        expect(isPrivateHost('2001:4860:4860::8888')).toBe(false);
    });

    it('Should return false for non-IP hostnames or invalid values', () => {
        expect(isPrivateHost('example.com')).toBe(false);
        expect(isPrivateHost('not-an-ip')).toBe(false);
        expect(isPrivateHost('')).toBe(false);
    });
});

describe('Probe redirect', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('Should return redirect details for 3xx responses with location', async () => {
        const headers = new Headers({ location: '/next' });
        vi.mocked(fetch).mockResolvedValueOnce({
            status: 302,
            headers,
        } as Response);

        const result = await probeRedirect('https://example.com/start');

        expect(result).toEqual({
            kind: 'redirect',
            statusCode: 302,
            targetUrl: 'https://example.com/next',
            targetHost: 'example.com',
        });

        expect(fetch).toHaveBeenCalledWith('https://example.com/start', {
            method: 'HEAD',
            redirect: 'manual',
            signal: expect.any(AbortSignal),
            headers: {
                'user-agent': 'linklite-enrichment-worker/1.0',
                accept: '*/*',
            },
        });
    });

    it('Should return no-redirect for non-3xx responses', async () => {
        vi.mocked(fetch)
            .mockResolvedValueOnce({
                status: 200,
                headers: new Headers(),
            } as Response)
            .mockResolvedValueOnce({
                status: 200,
                headers: new Headers(),
            } as Response);

        const result = await probeRedirect('https://example.com');

        expect(result).toEqual({ kind: 'no-redirect' });
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(vi.mocked(fetch).mock.calls[0]?.[1]?.method).toBe('HEAD');
        expect(vi.mocked(fetch).mock.calls[1]?.[1]?.method).toBe('GET');
    });

    it('Should return no-redirect when location header is missing', async () => {
        vi.mocked(fetch)
            .mockResolvedValueOnce({
                status: 302,
                headers: new Headers(),
            } as Response)
            .mockResolvedValueOnce({
                status: 302,
                headers: new Headers(),
            } as Response);

        const result = await probeRedirect('https://example.com');

        expect(result).toEqual({ kind: 'no-redirect' });
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('Should return no-redirect for invalid URLs without calling fetch', async () => {
        const result = await probeRedirect('not-a-url');

        expect(result).toEqual({ kind: 'no-redirect' });
        expect(fetch).not.toHaveBeenCalled();
    });
});

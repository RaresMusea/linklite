import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inferIsShortener } from '@/lib/redirect_safety/link_shortener_check';
import { getRegistrableDomain } from '@/lib/utils';

vi.mock('@/lib/utils', () => ({
    getRegistrableDomain: vi.fn(),
}));

describe('Infer is shortener', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Should return false when original domain cannot be determined', () => {
        vi.mocked(getRegistrableDomain).mockReturnValueOnce(null);

        const result = inferIsShortener('invalid-host', { kind: 'no-redirect' });

        expect(result).toBe(false);
        expect(getRegistrableDomain).toHaveBeenCalledTimes(1);
    });

    it('Should return true when original domain is a known shortener', () => {
        vi.mocked(getRegistrableDomain).mockReturnValueOnce('bit.ly');

        const result = inferIsShortener('bit.ly', { kind: 'no-redirect' });

        expect(result).toBe(true);
        expect(getRegistrableDomain).toHaveBeenCalledTimes(1);
    });

    it('Should return false when probe is not a redirect', () => {
        vi.mocked(getRegistrableDomain).mockReturnValueOnce('example.com');

        const result = inferIsShortener('example.com', { kind: 'no-redirect' });

        expect(result).toBe(false);
        expect(getRegistrableDomain).toHaveBeenCalledTimes(1);
    });

    it('Should return false when target domain cannot be determined', () => {
        vi.mocked(getRegistrableDomain).mockReturnValueOnce('example.com').mockReturnValueOnce(null);

        const result = inferIsShortener('example.com', {
            kind: 'redirect',
            statusCode: 302,
            targetUrl: 'https://unknown',
            targetHost: 'unknown',
        });

        expect(result).toBe(false);
        expect(getRegistrableDomain).toHaveBeenCalledTimes(2);
    });

    it('Should return false when redirect stays on the same registrable domain', () => {
        vi.mocked(getRegistrableDomain)
            .mockReturnValueOnce('example.com')
            .mockReturnValueOnce('example.com');

        const result = inferIsShortener('example.com', {
            kind: 'redirect',
            statusCode: 301,
            targetUrl: 'https://www.example.com/path',
            targetHost: 'www.example.com',
        });

        expect(result).toBe(false);
    });

    it('Should return true when redirect goes to a different registrable domain', () => {
        vi.mocked(getRegistrableDomain)
            .mockReturnValueOnce('example.com')
            .mockReturnValueOnce('destination.com');

        const result = inferIsShortener('example.com', {
            kind: 'redirect',
            statusCode: 302,
            targetUrl: 'https://destination.com',
            targetHost: 'destination.com',
        });

        expect(result).toBe(true);
    });
});

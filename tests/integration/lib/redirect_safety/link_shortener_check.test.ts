import { describe, it, expect } from 'vitest';
import { inferIsShortener } from '@/lib/redirect_safety/link_shortener_check';


describe('Infer is shortener - Integration', () => {
    it('Should return true for known shortener domains without needing a redirect', () => {
        const result = inferIsShortener('bit.ly', { kind: 'no-redirect' });

        expect(result).toBe(true);
    });

    it('Should return false when probe is not a redirect and domain is not a shortener', () => {
        const result = inferIsShortener('example.com', { kind: 'no-redirect' });

        expect(result).toBe(false);
    });

    it('Should return false when redirect stays on the same registrable domain', () => {
        const result = inferIsShortener('example.com', {
            kind: 'redirect',
            statusCode: 301,
            targetUrl: 'https://www.example.com/path',
            targetHost: 'www.example.com',
        });

        expect(result).toBe(false);
    });

    it('Should return true when redirect goes to a different registrable domain', () => {
        const result = inferIsShortener('example.com', {
            kind: 'redirect',
            statusCode: 302,
            targetUrl: 'https://destination.com',
            targetHost: 'destination.com',
        });

        expect(result).toBe(true);
    });

    it('Should return false when original host is not a registrable domain', () => {
        const result = inferIsShortener('invalid-host', { kind: 'no-redirect' });

        expect(result).toBe(false);
    });
});

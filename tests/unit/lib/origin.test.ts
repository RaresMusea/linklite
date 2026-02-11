import { describe, it, expect } from 'vitest';
import { getOriginFromHeaders } from '@/lib/origin';

describe('getOriginFromHeaders', () => {
    it('uses x-forwarded headers when present', () => {
        const headers = new Headers({
            'x-forwarded-proto': 'https',
            'x-forwarded-host': 'staging.linklite.dev',
        });

        expect(getOriginFromHeaders(headers, 'http')).toBe('https://staging.linklite.dev');
    });

    it('falls back to host header', () => {
        const headers = new Headers({
            host: 'localhost:3000',
        });

        expect(getOriginFromHeaders(headers, 'http')).toBe('http://localhost:3000');
    });

    it('returns null when no host is present', () => {
        const headers = new Headers();

        expect(getOriginFromHeaders(headers, 'http')).toBeNull();
    });
});

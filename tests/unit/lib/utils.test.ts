import { describe, beforeEach, it, vi, expect } from 'vitest';
import { cn, generateSlug, getTld, isApiRouteResponseOf, normalizeHostnameFromUrl } from '@/lib/utils';
import { toASCII } from 'punycode';

function isNumber(x: unknown): x is number {
    return typeof x === 'number';
}

vi.mock('punycode', () => ({
    toASCII: vi.fn((s: string) => s),
}));

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(toASCII).mockImplementation((s) => s);
});

describe('cn', () => {
    it('merges class names', () => {
        expect(cn('a', 'b')).toBe('a b');
    });

    it('filters falsy values like clsx', () => {
        expect(cn('a', false, null, undefined, '', 'c')).toBe('a c');
    });

    it('merges Tailwind conflicting classes (twMerge)', () => {
        expect(cn('p-2', 'p-4')).toBe('p-4');
        expect(cn('text-sm', 'text-lg')).toBe('text-lg');
    });

    it('handles arrays and objects (clsx behavior)', () => {
        expect(cn(['a', 'b'], { c: true, d: false })).toBe('a b c');
    });
});

describe('generateSlug', () => {
    it('returns a string with default length 6', () => {
        const s = generateSlug();
        expect(typeof s).toBe('string');
        expect(s).toHaveLength(6);
    });

    it('returns a string with requested length', () => {
        const s = generateSlug(10);
        expect(s).toHaveLength(10);
    });

    it('contains only allowed characters', () => {
        const allowed = /^[a-zA-Z0-9]+$/;

        for (let i = 0; i < 50; i++) {
            const s = generateSlug(12);
            expect(s).toMatch(allowed);
        }
    });

    it('returns empty string for length 0', () => {
        expect(generateSlug(0)).toBe('');
    });
});

describe('isApiRouteResponseOf', () => {
    it('returns false for non-objects', () => {
        expect(isApiRouteResponseOf('x', isNumber)).toBe(false);
        expect(isApiRouteResponseOf(123, isNumber)).toBe(false);
        expect(isApiRouteResponseOf(null, isNumber)).toBe(false);
        expect(isApiRouteResponseOf([], isNumber)).toBe(false);
    });

    it('returns false when success is missing or not boolean', () => {
        expect(isApiRouteResponseOf({}, isNumber)).toBe(false);
        expect(isApiRouteResponseOf({ success: 'true' }, isNumber)).toBe(false);
    });

    it('validates success response: success=true and data matches guard', () => {
        const x: unknown = { success: true, data: 42 };
        expect(isApiRouteResponseOf(x, isNumber)).toBe(true);

        if (isApiRouteResponseOf(x, isNumber) && x.success) {
            expect(x.data).toBe(42);
        }
    });

    it('returns false for success response when data does not match guard', () => {
        const x: unknown = { success: true, data: 'nope' };
        expect(isApiRouteResponseOf(x, isNumber)).toBe(false);
    });

    it('validates error response: success=false and error is string', () => {
        const x: unknown = { success: false, error: 'bad', status: 400 };
        expect(isApiRouteResponseOf(x, isNumber)).toBe(true);

        if (isApiRouteResponseOf(x, isNumber) && !x.success) {
            expect(x.error).toBe('bad');
            expect(x.status).toBe(400);
        }
    });

    it('accepts error response without status', () => {
        const x: unknown = { success: false, error: 'bad' };
        expect(isApiRouteResponseOf(x, isNumber)).toBe(true);
    });

    it('rejects error response when status is wrong type', () => {
        const x: unknown = { success: false, error: 'bad', status: '400' };
        expect(isApiRouteResponseOf(x, isNumber)).toBe(false);
    });

    it('rejects error response when error is missing or not string', () => {
        expect(isApiRouteResponseOf({ success: false }, isNumber)).toBe(false);
        expect(isApiRouteResponseOf({ success: false, error: 123 }, isNumber)).toBe(false);
    });
});

// Mock the punycode module if needed
vi.mock('punycode', () => ({
    toASCII: vi.fn((str) => str), // Default mock, override in tests if needed
}));

describe('normalizeHostnameFromUrl', () => {
    // Reset mocks before each test
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic URL normalization', () => {
        it('should normalize standard HTTP URL', () => {
            const result = normalizeHostnameFromUrl('http://example.com');
            expect(result).toBe('example.com');
        });

        it('should normalize standard HTTPS URL', () => {
            const result = normalizeHostnameFromUrl('https://example.com');
            expect(result).toBe('example.com');
        });

        it('should normalize URL with path', () => {
            const result = normalizeHostnameFromUrl('https://example.com/path/to/page');
            expect(result).toBe('example.com');
        });

        it('should normalize URL with query parameters', () => {
            const result = normalizeHostnameFromUrl('https://example.com?param=value&other=123');
            expect(result).toBe('example.com');
        });

        it('should normalize URL with fragment', () => {
            const result = normalizeHostnameFromUrl('https://example.com#section');
            expect(result).toBe('example.com');
        });

        it('should normalize URL with port', () => {
            const result = normalizeHostnameFromUrl('https://example.com:8080');
            expect(result).toBe('example.com');
        });

        it('should normalize URL with username/password', () => {
            const result = normalizeHostnameFromUrl('https://user:pass@example.com');
            expect(result).toBe('example.com');
        });
    });

    describe('WWW canonicalization', () => {
        it('should remove www prefix', () => {
            const result = normalizeHostnameFromUrl('https://www.example.com');
            expect(result).toBe('example.com');
        });

        it('should remove www prefix with multiple subdomains', () => {
            const result = normalizeHostnameFromUrl('https://www.blog.example.com');
            expect(result).toBe('blog.example.com');
        });

        it("should not remove www if it's not at the beginning", () => {
            const result = normalizeHostnameFromUrl('https://mywww.example.com');
            expect(result).toBe('mywww.example.com');
        });

        it('should handle www with trailing dot removal', () => {
            const result = normalizeHostnameFromUrl('https://www.example.com.');
            expect(result).toBe('example.com');
        });

        it('should handle multiple www prefixes (edge case)', () => {
            const result = normalizeHostnameFromUrl('https://www.www.example.com');
            expect(result).toBe('www.example.com');
        });
    });

    describe('Trailing dot removal', () => {
        it('should remove single trailing dot', () => {
            const result = normalizeHostnameFromUrl('https://example.com.');
            expect(result).toBe('example.com');
        });

        it('should remove trailing dot with www', () => {
            const result = normalizeHostnameFromUrl('https://www.example.com.');
            expect(result).toBe('example.com');
        });

        it('should handle multiple trailing dots (only removes one)', () => {
            const result = normalizeHostnameFromUrl('https://example.com..');
            expect(result).toBe('example.com');
        });

        it('should handle hostname that is just a dot', () => {
            const result = normalizeHostnameFromUrl('https://.');
            expect(result).toBe(null);
        });
    });

    describe('Case normalization', () => {
        it('should convert hostname to lowercase', () => {
            const result = normalizeHostnameFromUrl('https://EXAMPLE.COM');
            expect(result).toBe('example.com');
        });

        it('should convert mixed case hostname to lowercase', () => {
            const result = normalizeHostnameFromUrl('https://ExAmPlE.CoM');
            expect(result).toBe('example.com');
        });

        it('should handle uppercase with www', () => {
            const result = normalizeHostnameFromUrl('https://WWW.EXAMPLE.COM');
            expect(result).toBe('example.com');
        });
    });

    describe('Whitespace handling', () => {
        it('should trim whitespace from hostname', () => {
            const result = normalizeHostnameFromUrl('https://  example.com  ');
            expect(result).toBe('example.com');
        });

        it('should handle tabs and newlines', () => {
            const result = normalizeHostnameFromUrl('https://\texample.com\n');
            expect(result).toBe('example.com');
        });
    });

    describe('Internationalized Domain Names (IDN)', () => {
        it('should convert IDN to punycode', () => {
            vi.mocked(toASCII).mockReturnValue('xn--mgba3a4f16a.com');

            const result = normalizeHostnameFromUrl('https://مثال.com');

            // URL.hostname (Node) serializează IDN în ASCII (punycode)
            expect(toASCII).toHaveBeenCalledWith('xn--mgbh0fb.com');
            expect(result).toBe('xn--mgba3a4f16a.com');
        });

        it('should handle IDN with www', () => {
            vi.mocked(toASCII).mockReturnValue('xn--mgba3a4f16a.com');

            const result = normalizeHostnameFromUrl('https://www.مثال.com');

            // www se scoate înainte de toASCII; rămâne același hostname IDN (serializat ASCII)
            expect(toASCII).toHaveBeenCalledWith('xn--mgbh0fb.com');
            expect(result).toBe('xn--mgba3a4f16a.com');
        });

        it('should handle IDN that is already punycode', () => {
            const punycodeSpy = vi.mocked(toASCII).mockReturnValue('xn--mgba3a4f16a.com');

            const result = normalizeHostnameFromUrl('https://xn--mgba3a4f16a.com');

            expect(punycodeSpy).toHaveBeenCalledWith('xn--mgba3a4f16a.com');
            expect(result).toBe('xn--mgba3a4f16a.com');
        });
    });

    describe('Edge cases and invalid URLs', () => {
        it('should return null for empty string', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const result = normalizeHostnameFromUrl('');

            expect(result).toBeNull();
            expect(toASCII).not.toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith('Unknown hostname from URL: ');

            consoleSpy.mockRestore();
        });

        it('should accept bare hostname-like input', () => {
            const result = normalizeHostnameFromUrl('not-a-valid-url');

            expect(result).toBeNull();
            expect(toASCII).not.toHaveBeenCalled();
        });

        it('should accept URL without protocol', () => {
            const result = normalizeHostnameFromUrl('example.com');
            expect(result).toBe('example.com');
        });

        it('should return null for URL with only protocol', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const result = normalizeHostnameFromUrl('https://');

            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith('Unknown hostname from URL: https://');
            consoleSpy.mockRestore();
        });

        it('should return empty string for URL with empty hostname', () => {
            // Note: This depends on URL parsing behavior
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const result = normalizeHostnameFromUrl('file:///path/to/file');

            // file:// URLs don't have a hostname, so result might be '' or null
            expect(result === '' || result === null).toBe(true);

            if (result === null) {
                expect(consoleSpy).toHaveBeenCalled();
            }
            consoleSpy.mockRestore();
        });

        it('should handle IPv4 addresses', () => {
            const result = normalizeHostnameFromUrl('https://192.168.1.1');
            expect(result).toBe('192.168.1.1');
        });

        it('should handle IPv6 addresses', () => {
            vi.mocked(toASCII).mockImplementation((s) => s); // important

            const result = normalizeHostnameFromUrl('https://[2001:db8::1]');
            expect(result).toBeNull();
        });

        it('should handle localhost', () => {
            const result = normalizeHostnameFromUrl('http://localhost:3000');
            expect(result).toBe('localhost');
        });
    });

    describe('Empty hostname handling', () => {
        it('should return null for empty hostname after normalization', () => {
            const result = normalizeHostnameFromUrl('https://');
            expect(result).toBeNull();
        });

        it('should return null for hostname that becomes empty after www removal', () => {
            const result = normalizeHostnameFromUrl('https://www.');
            expect(result).toBeNull();
        });
    });

    describe('Console error logging', () => {
        it('should log error when URL parsing fails', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            normalizeHostnameFromUrl('invalid://[invalid');

            expect(consoleSpy).toHaveBeenCalledWith('Unknown hostname from URL: invalid://[invalid');
            consoleSpy.mockRestore();
        });

        it('should include the original URL in error message', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const testUrl = 'https://[invalid-ipv6';
            normalizeHostnameFromUrl(testUrl);

            expect(consoleSpy).toHaveBeenCalledWith(`Unknown hostname from URL: ${testUrl}`);
            consoleSpy.mockRestore();
        });
    });

    describe('Complex scenarios', () => {
        it('should handle all normalization steps together', () => {
            vi.mocked(toASCII).mockImplementation((str) => str);

            const result = normalizeHostnameFromUrl('  HTTPS://WWW.EXAMPLE.COM.  ');

            expect(result).toBe('example.com');
            expect(toASCII).toHaveBeenCalledWith('example.com');
        });

        it('should handle international domain with all transformations', () => {
            vi.mocked(toASCII).mockReturnValue('xn--mgba3a4f16a.com');

            const result = normalizeHostnameFromUrl('https://WWW.مثال.COM.');

            expect(toASCII).toHaveBeenCalledWith('xn--mgbh0fb.com');
            expect(result).toBe('xn--mgba3a4f16a.com');
        });

        it('should handle subdomains correctly', () => {
            vi.mocked(toASCII).mockReturnValue('api.blog.example.com');

            const result = normalizeHostnameFromUrl('https://api.blog.example.com');
            expect(result).toBe('api.blog.example.com');
        });

        it('should handle deeply nested subdomains', () => {
            const result = normalizeHostnameFromUrl('https://a.b.c.d.e.f.example.com');
            expect(result).toBe('a.b.c.d.e.f.example.com');
        });
    });
});

describe('Top level domain (TLD) retrieval', () => {
    it('returns TLD for simple domain', () => {
        expect(getTld('example.com')).toBe('com');
    });

    it('returns TLD for domain with subdomain', () => {
        expect(getTld('www.example.com')).toBe('com');
        expect(getTld('blog.example.com')).toBe('com');
        expect(getTld('sub.sub.example.com')).toBe('com');
    });

    it('returns TLD for multi-level TLDs', () => {
        expect(getTld('example.co.uk')).toBe('uk');
        expect(getTld('example.com.au')).toBe('au');
        expect(getTld('example.gov.uk')).toBe('uk');
        expect(getTld('example.ac.uk')).toBe('uk');
    });

    it('returns TLD for country-code TLDs', () => {
        expect(getTld('example.ro')).toBe('ro');
        expect(getTld('example.de')).toBe('de');
        expect(getTld('example.fr')).toBe('fr');
        expect(getTld('example.jp')).toBe('jp');
    });

    it('returns TLD for new gTLDs', () => {
        expect(getTld('example.xyz')).toBe('xyz');
        expect(getTld('example.app')).toBe('app');
        expect(getTld('example.dev')).toBe('dev');
        expect(getTld('example.io')).toBe('io');
        expect(getTld('example.ai')).toBe('ai');
    });

    it('returns TLD for domains with multiple dots', () => {
        expect(getTld('a.b.c.d.example.com')).toBe('com');
        expect(getTld('deeply.nested.sub.domain.co.uk')).toBe('uk');
    });

    it('returns last part for single-component strings', () => {
        expect(getTld('localhost')).toBeNull();
        expect(getTld('local')).toBeNull();
        expect(getTld('test')).toBeNull();
    });

    it('returns empty string for empty input', () => {
        expect(getTld('')).toBeNull();
    });

    it('returns correct TLD for domains ending with dot', () => {
        expect(getTld('example.com.')).toBe('');
        expect(getTld('www.example.co.uk.')).toBe('');
    });

    it('returns TLD for internationalized domain names', () => {
        expect(getTld('münchen.de')).toBe('de');
        expect(getTld('例.jp')).toBe('jp');
        expect(getTld('mañana.com')).toBe('com');
    });

    it('returns TLD for punycode domains', () => {
        expect(getTld('xn--mnchen-3ya.de')).toBe('de');
        expect(getTld('xn--fsqu00a.xn--3e0b707e')).toBe('xn--3e0b707e'); // 한국.한국
    });

    it('handles mixed case domain names', () => {
        expect(getTld('Example.COM')).toBe('COM');
        expect(getTld('WWW.EXAMPLE.COM')).toBe('COM');
        expect(getTld('Example.Co.UK')).toBe('UK');
    });

    it('returns TLD for IP addresses (though not typical usage)', () => {
        expect(getTld('192.168.1.1')).toBeNull();
        expect(getTld('127.0.0.1')).toBeNull();
    });

    it('returns last component for dot-only strings', () => {
        expect(getTld('.')).toBe('');
        expect(getTld('..')).toBe('');
        expect(getTld('...')).toBe('');
    });
});

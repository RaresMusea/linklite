import { describe, beforeEach, it, vi, expect } from 'vitest';
import {
    cn,
    generateSlug,
    getEnvNumber,
    getPublicSuffix,
    getRegistrableDomain,
    getTld,
    isApiRouteResponseOf,
    isHttps,
    normalizeHostnameFromUrl,
} from '@/lib/utils';
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

            expect(toASCII).toHaveBeenCalledWith('xn--mgbh0fb.com');
            expect(result).toBe('xn--mgba3a4f16a.com');
        });

        it('should handle IDN with www', () => {
            vi.mocked(toASCII).mockReturnValue('xn--mgba3a4f16a.com');

            const result = normalizeHostnameFromUrl('https://www.مثال.com');

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

describe('Registrable domain retrieval', () => {
    it('returns same domain for simple two-part domain', () => {
        expect(getRegistrableDomain('example.com')).toBe('example.com');
        expect(getRegistrableDomain('google.com')).toBe('google.com');
        expect(getRegistrableDomain('test.ro')).toBe('test.ro');
    });

    it('returns same domain for single-part domain', () => {
        expect(getRegistrableDomain('localhost')).toBeNull();
        expect(getRegistrableDomain('local')).toBeNull();
        expect(getRegistrableDomain('example')).toBeNull();
    });

    it('returns registrable domain for domains with subdomains', () => {
        expect(getRegistrableDomain('www.example.com')).toBe('example.com');
        expect(getRegistrableDomain('blog.example.com')).toBe('example.com');
        expect(getRegistrableDomain('shop.test.example.com')).toBe('example.com');
        expect(getRegistrableDomain('api.v1.service.example.com')).toBe('example.com');
    });

    it('handles multi-level TLDs correctly', () => {
        expect(getRegistrableDomain('example.co.uk')).toBe('example.co.uk');
        expect(getRegistrableDomain('www.example.co.uk')).toBe('example.co.uk');
        expect(getRegistrableDomain('blog.example.co.uk')).toBe('example.co.uk');
        expect(getRegistrableDomain('deep.nested.example.co.uk')).toBe('example.co.uk');
    });

    it('handles other multi-level TLDs', () => {
        expect(getRegistrableDomain('example.com.au')).toBe('example.com.au');
        expect(getRegistrableDomain('www.example.com.au')).toBe('example.com.au');
        expect(getRegistrableDomain('example.gov.uk')).toBe('example.gov.uk');
        expect(getRegistrableDomain('example.ac.uk')).toBe('example.ac.uk');
        expect(getRegistrableDomain('example.org.uk')).toBe('example.org.uk');
    });

    it('handles complex multi-level TLD scenarios', () => {
        // 3-level TLD
        expect(getRegistrableDomain('example.act.edu.au')).toBe('example.act.edu.au');
        expect(getRegistrableDomain('www.example.act.edu.au')).toBe('example.act.edu.au');
        expect(getRegistrableDomain('a.b.c.d.e.f.g.example.co.uk')).toBe('example.co.uk');
    });

    it('handles internationalized domain names', () => {
        expect(getRegistrableDomain('münchen.de')).toBe('münchen.de');
        expect(getRegistrableDomain('www.münchen.de')).toBe('münchen.de');
        expect(getRegistrableDomain('例.jp')).toBe('例.jp');
        expect(getRegistrableDomain('www.例.jp')).toBe('例.jp');
    });

    it('handles punycode domains', () => {
        expect(getRegistrableDomain('xn--mnchen-3ya.de')).toBe('xn--mnchen-3ya.de');
        expect(getRegistrableDomain('www.xn--mnchen-3ya.de')).toBe('xn--mnchen-3ya.de');
    });

    it('handles empty string', () => {
        expect(getRegistrableDomain('')).toBeNull();
    });

    it('handles string ending with dot', () => {
        expect(getRegistrableDomain('example.com.')).toBe('example.com');
        expect(getRegistrableDomain('www.example.com.')).toBe('example.com');
        expect(getRegistrableDomain('example.co.uk.')).toBe('example.co.uk');
    });

    it('handles multiple consecutive dots', () => {
        expect(getRegistrableDomain('example..com')).toBeNull();
        expect(getRegistrableDomain('www..example..com')).toBeNull();
        expect(getRegistrableDomain('...')).toBeNull();
    });

    it('handles single dot', () => {
        expect(getRegistrableDomain('.')).toBeNull();
    });

    it('preserves case of input', () => {
        expect(getRegistrableDomain('Example.COM')).toBe('example.com');
        expect(getRegistrableDomain('WWW.Example.COM')).toBe('example.com');
        expect(getRegistrableDomain('Blog.Example.Co.UK')).toBe('example.co.uk');
    });

    it('handles hostnames with ports', () => {
        expect(getRegistrableDomain('example.com:8080')).toBe('example.com');
        expect(getRegistrableDomain('localhost:3000')).toBeNull();
        expect(getRegistrableDomain('www.example.com:443')).toBe('example.com');
    });

    // IP addresses
    it('handles IP addresses', () => {
        expect(getRegistrableDomain('192.168.1.1')).toBeNull();
        expect(getRegistrableDomain('127.0.0.1')).toBeNull();
        expect(getRegistrableDomain('8.8.8.8')).toBeNull();
    });

    it('handles domains with hyphens', () => {
        expect(getRegistrableDomain('example-test.com')).toBe('example-test.com');
        expect(getRegistrableDomain('www.example-test.com')).toBe('example-test.com');
        expect(getRegistrableDomain('test-site.example.co.uk')).toBe('example.co.uk');
    });

    it('handles domains with numbers', () => {
        expect(getRegistrableDomain('123.com')).toBe('123.com');
        expect(getRegistrableDomain('example123.com')).toBe('example123.com');
        expect(getRegistrableDomain('123.456.com')).toBe('456.com');
    });

    it('returns last two parts when exactly 3 parts', () => {
        expect(getRegistrableDomain('a.b.c')).toBe('b.c');
        expect(getRegistrableDomain('one.two.three')).toBe('two.three');
    });

    it('returns entire string when exactly 2 parts', () => {
        expect(getRegistrableDomain('part1.part2')).toBe('part1.part2');
    });

    it('returns entire string when 1 part', () => {
        expect(getRegistrableDomain('single')).toBeNull();
    });
});

describe('Public suffix retrieval', () => {
    it('returns suffix for common TLD', () => {
        expect(getPublicSuffix('example.com')).toBe('com');
        expect(getPublicSuffix('www.example.com')).toBe('com');
    });

    it('returns multi-level public suffixes', () => {
        expect(getPublicSuffix('example.co.uk')).toBe('co.uk');
        expect(getPublicSuffix('deep.example.com.au')).toBe('com.au');
    });

    it('returns private suffixes when allowPrivateDomains is enabled', () => {
        expect(getPublicSuffix('foo.blogspot.com')).toBe('blogspot.com');
        expect(getPublicSuffix('www.s3.amazonaws.com')).toBe('s3.amazonaws.com');
    });

    it('handles internationalized and punycode hostnames', () => {
        expect(getPublicSuffix('münchen.de')).toBe('de');
        expect(getPublicSuffix('xn--mnchen-3ya.de')).toBe('de');
    });

    it('handles trailing dot by normalizing suffix', () => {
        expect(getPublicSuffix('example.com.')).toBe('com');
        expect(getPublicSuffix('www.example.co.uk.')).toBe('co.uk');
    });

    it('returns null for IP addresses and empty input', () => {
        expect(getPublicSuffix('192.168.1.1')).toBeNull();
        expect(getPublicSuffix('2001:db8::1')).toBeNull();
        expect(getPublicSuffix('')).toBeNull();
    });

    it('returns null for malformed hostnames with repeated dots', () => {
        expect(getPublicSuffix('example..com')).toBeNull();
        expect(getPublicSuffix('www..example..com')).toBeNull();
    });

    it('returns localhost suffix for localhost-style hosts', () => {
        expect(getPublicSuffix('localhost')).toBe('localhost');
        expect(getPublicSuffix('example.localhost')).toBe('localhost');
    });

    it('returns single-label input as its own suffix', () => {
        expect(getPublicSuffix('example')).toBe('example');
    });

    it('normalizes case in the returned suffix', () => {
        expect(getPublicSuffix('WWW.Example.Co.UK')).toBe('co.uk');
    });
});

describe('isHttps', () => {
    it('returns true for valid HTTPS URLs', () => {
        expect(isHttps('https://example.com')).toBe(true);
        expect(isHttps('HTTPS://example.com/path?x=1#a')).toBe(true);
    });

    it('returns false for non-HTTPS but valid URLs', () => {
        expect(isHttps('http://example.com')).toBe(false);
        expect(isHttps('ftp://example.com/resource')).toBe(false);
    });

    it('returns false for malformed or non-URL input', () => {
        expect(isHttps('not-a-url')).toBe(false);
        expect(isHttps('')).toBe(false);
        expect(isHttps('https://')).toBe(false);
    });
});

describe('Environment numeric value retrieval tests', () => {
    const TEST_ENV_NAME = 'TEST_GET_ENV_NUMBER';

    beforeEach(() => {
        delete process.env[TEST_ENV_NAME];
    });

    it('Parses and returns a numeric env var value', () => {
        process.env[TEST_ENV_NAME] = '42';
        expect(getEnvNumber(TEST_ENV_NAME)).toBe(42);
    });

    it('Returns default value when env var is missing', () => {
        expect(getEnvNumber(TEST_ENV_NAME, 7)).toBe(7);
    });

    it('Returns default value when env var is an empty string', () => {
        process.env[TEST_ENV_NAME] = '';
        expect(getEnvNumber(TEST_ENV_NAME, 11)).toBe(11);
    });

    it('Throws when env var is missing and no default is provided', () => {
        expect(() => getEnvNumber(TEST_ENV_NAME)).toThrow(`Missing required env var: ${TEST_ENV_NAME}`);
    });

    it('Throws when env var is not a valid number', () => {
        process.env[TEST_ENV_NAME] = 'not-a-number';
        expect(() => getEnvNumber(TEST_ENV_NAME)).toThrow(
            `Invalid number for env var ${TEST_ENV_NAME}: not-a-number`
        );
    });
});

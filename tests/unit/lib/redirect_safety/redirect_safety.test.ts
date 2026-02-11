// isAllowlisted.test.ts
import { describe, it, expect } from 'vitest';
import { TRUSTED_DOMAINS } from '@/lib/redirect_safety/trusted_domains';
import { isAllowlisted } from '@/lib/redirect_safety/redirect_safety';

describe('isAllowlisted', () => {
    describe('Valid URLs - positive cases', () => {
        it('should return true for exact domain match', () => {
            expect(isAllowlisted('https://github.com/username/repo')).toBe(true);
            expect(isAllowlisted('https://stackoverflow.com/questions/123')).toBe(true);
            expect(isAllowlisted('https://wikipedia.org/wiki/Page')).toBe(true);
        });

        it('should return true for subdomain of trusted domain', () => {
            expect(isAllowlisted('https://docs.github.com')).toBe(true);
            expect(isAllowlisted('https://www.google.com/search')).toBe(true);
            expect(isAllowlisted('https://subdomain.microsoft.com')).toBe(true);
            expect(isAllowlisted('https://api.stripe.com')).toBe(true);
        });

        it('should handle www prefix correctly', () => {
            expect(isAllowlisted('https://www.youtube.com/watch?v=test')).toBe(true);
            expect(isAllowlisted('https://www.netflix.com/browse')).toBe(true);
            expect(isAllowlisted('https://www.amazon.com/product')).toBe(true);
        });

        it('should handle different protocols', () => {
            expect(isAllowlisted('http://google.com')).toBe(true);
            expect(isAllowlisted('https://google.com')).toBe(true);
            expect(isAllowlisted('ftp://google.com')).toBe(true);
        });

        it('should handle URLs with ports', () => {
            expect(isAllowlisted('https://localhost:3000')).toBe(false);
            expect(isAllowlisted('https://github.com:443')).toBe(true);
        });

        it('should handle URLs with paths, queries and fragments', () => {
            expect(isAllowlisted('https://github.com/user/repo?param=value#section')).toBe(true);
            expect(isAllowlisted('https://stackoverflow.com/questions/123/title?sort=votes')).toBe(true);
        });

        it('should be case insensitive', () => {
            expect(isAllowlisted('https://GITHUB.com')).toBe(true);
            expect(isAllowlisted('https://GitHub.com/User')).toBe(true);
            expect(isAllowlisted('HTTPS://WWW.GOOGLE.COM')).toBe(true);
        });
    });

    describe('Valid URLs - negative cases', () => {
        it('should return false for untrusted domains', () => {
            expect(isAllowlisted('https://evil.com')).toBe(false);
            expect(isAllowlisted('https://phishing-site.com')).toBe(false);
            expect(isAllowlisted('https://malicious-domain.org')).toBe(false);
        });

        it('should return false for subdomains of untrusted domains', () => {
            expect(isAllowlisted('https://trusted.evil.com')).toBe(false);
            expect(isAllowlisted('https://api.malicious-site.net')).toBe(false);
        });

        it('should return false for similar-looking domains (typosquatting)', () => {
            // Common typosquatting examples
            expect(isAllowlisted('https://githu6.com')).toBe(false);
            expect(isAllowlisted('https://github-com.com')).toBe(false);
            expect(isAllowlisted('https://gooogle.com')).toBe(false);
            expect(isAllowlisted('https://faceb00k.com')).toBe(false);
        });

        it('should return false for localhost', () => {
            expect(isAllowlisted('http://localhost')).toBe(false);
            expect(isAllowlisted('http://localhost:3000')).toBe(false);
            expect(isAllowlisted('http://127.0.0.1')).toBe(false);
        });

        it('should return false for internal/private domains', () => {
            expect(isAllowlisted('http://192.168.1.1')).toBe(false);
            expect(isAllowlisted('https://internal.company.net')).toBe(false);
            expect(isAllowlisted('http://10.0.0.1')).toBe(false);
        });
    });

    describe('Edge cases and error handling', () => {
        it('should return false for invalid URLs', () => {
            expect(isAllowlisted('not-a-url')).toBe(false);
            expect(isAllowlisted('')).toBe(false);
            expect(isAllowlisted('http://')).toBe(false);
            expect(isAllowlisted('://example.com')).toBe(false);
        });

        it('should return false for malformed URLs', () => {
            expect(isAllowlisted('http:///example.com')).toBe(false);
            expect(isAllowlisted('https://example..com')).toBe(false);
        });

        it('should handle IP addresses', () => {
            expect(isAllowlisted('https://8.8.8.8')).toBe(false);
            expect(isAllowlisted('http://192.168.0.1:8080')).toBe(false);
        });

        it('should handle Internationalized Domain Names (IDN)', () => {
            // This would be false since it's not in the trusted list
            expect(isAllowlisted('https://münchen.de')).toBe(false);
        });

        it('should handle very long domains', () => {
            const longDomain = 'a'.repeat(100) + '.com';
            expect(isAllowlisted(`https://${longDomain}`)).toBe(false);
        });
    });

    describe('Specific domain patterns', () => {
        it('should correctly match domains with multiple subdomains', () => {
            expect(isAllowlisted('https://api.subdomain.github.com')).toBe(true);
            expect(isAllowlisted('https://a.b.c.d.google.com')).toBe(true);
        });

        it('should handle second-level domains correctly', () => {
            // amazonaws.com should match subdomains
            expect(isAllowlisted('https://s3.amazonaws.com')).toBe(true);
            expect(isAllowlisted('https://bucket.s3.amazonaws.com')).toBe(true);

            // githubusercontent.com should match subdomains
            expect(isAllowlisted('https://raw.githubusercontent.com')).toBe(true);
        });

        it('should not match partial domain names', () => {
            // Should not match "google" in "notgoogle.com"
            expect(isAllowlisted('https://notgoogle.com')).toBe(false);

            // Should not match "GitHub" in "fakegithub.com"
            expect(isAllowlisted('https://fakegithub.com')).toBe(false);
        });
    });

    describe('Performance and security considerations', () => {
        it('should handle very long URL strings efficiently', () => {
            const longPath = '/'.repeat(10000);
            const url = `https://github.com${longPath}`;

            const start = performance.now();
            const result = isAllowlisted(url);
            const end = performance.now();

            expect(result).toBe(true);
            expect(end - start).toBeLessThan(100); // Should complete in under 100ms
        });

        it('should not be vulnerable to ReDoS via crafted URLs', () => {
            // Test with potentially problematic regex patterns
            const maliciousUrl = 'https://' + 'a.'.repeat(1000) + 'github.com';

            const start = performance.now();
            const result = isAllowlisted(maliciousUrl);
            const end = performance.now();

            expect(result).toBe(true);
            expect(end - start).toBeLessThan(100);
        });
    });

    describe('Integration with TRUSTED_DOMAINS', () => {
        it('should work with all domains in TRUSTED_DOMAINS', () => {
            // Test a sampling of domains from the list
            const testDomains = ['google.com', 'github.com', 'stripe.com', 'openai.com', 'wikipedia.org'];

            testDomains.forEach((domain) => {
                expect(isAllowlisted(`https://${domain}`)).toBe(true);
                expect(isAllowlisted(`https://www.${domain}`)).toBe(true);
                expect(isAllowlisted(`https://sub.${domain}`)).toBe(true);
            });
        });

        it('should handle Set iteration correctly', () => {
            // Ensure the function works with Set (spread operator)
            expect(isAllowlisted('https://example.com')).toBe(false);
            expect(isAllowlisted('https://github.com')).toBe(true);
        });
    });
});

// Optional: Tests for the TRUSTED_DOMAINS constant itself
describe('TRUSTED_DOMAINS', () => {
    it('should be a Set', () => {
        expect(TRUSTED_DOMAINS).toBeInstanceOf(Set);
    });

    it('should contain expected domains', () => {
        expect(TRUSTED_DOMAINS.has('github.com')).toBe(true);
        expect(TRUSTED_DOMAINS.has('google.com')).toBe(true);
        expect(TRUSTED_DOMAINS.has('openai.com')).toBe(true);
    });

    it('should not contain unexpected domains', () => {
        expect(TRUSTED_DOMAINS.has('example.com')).toBe(false);
        expect(TRUSTED_DOMAINS.has('localhost')).toBe(false);
    });

    it('should have case-insensitive entries', () => {
        // The Set stores lowercase, but let's verify usage
        expect(TRUSTED_DOMAINS.has('GITHUB.COM')).toBe(false); // Should be lowercase
        expect(TRUSTED_DOMAINS.has('github.com')).toBe(true);
    });
});
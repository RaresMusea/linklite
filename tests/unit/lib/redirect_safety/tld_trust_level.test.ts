import { describe, expect, it } from 'vitest';
import { hasLowTrustTld, isNonAllowlistedTld } from '@/lib/redirect_safety/tld_trust_level';

describe('tld_trust_level', () => {
    describe('hasLowTrustTld', () => {
        it('Returns true when public suffix cannot be parsed', () => {
            expect(hasLowTrustTld('192.168.1.1')).toBe(true);
        });

        it('Returns true for low-trust suffixes', () => {
            expect(hasLowTrustTld('phish.example.xyz')).toBe(true);
        });

        it('Returns false for suffixes not in the low-trust set', () => {
            expect(hasLowTrustTld('safe.example.com')).toBe(false);
        });
    });

    describe('isNonAllowlistedTld', () => {
        it('Returns true when public suffix cannot be parsed', () => {
            expect(isNonAllowlistedTld('2001:db8::1')).toBe(true);
        });

        it('Returns false for allowlisted high-trust suffixes', () => {
            expect(isNonAllowlistedTld('portal.example.com')).toBe(false);
            expect(isNonAllowlistedTld('app.example.co.uk')).toBe(false);
        });

        it('Returns true for suffixes outside the high-trust allowlist', () => {
            expect(isNonAllowlistedTld('random.example.zip')).toBe(true);
        });
    });
});

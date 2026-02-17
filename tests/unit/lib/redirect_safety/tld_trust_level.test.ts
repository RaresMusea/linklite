import { describe, expect, it } from 'vitest';
import { getTldTrustLevel, hasLowTrustTld, isNonAllowlistedTld } from '@/lib/redirect_safety/tld_trust_level';

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

    describe('getTldTrustLevel', () => {
        it('Returns low for low-trust suffixes', () => {
            expect(getTldTrustLevel('phish.example.xyz')).toBe('low');
        });

        it('Returns unknown for non-allowlisted suffixes that are not low-trust', () => {
            expect(getTldTrustLevel('random.example.zip')).toBe('unknown');
        });

        it('Returns high for allowlisted high-trust suffixes', () => {
            expect(getTldTrustLevel('portal.example.com')).toBe('high');
            expect(getTldTrustLevel('app.example.co.uk')).toBe('high');
        });

        it('Prefers low when a suffix exists in both low-trust and high-trust sets', () => {
            expect(getTldTrustLevel('example.info')).toBe('low');
            expect(getTldTrustLevel('example.tech')).toBe('low');
        });

        it('Returns low when suffix cannot be parsed', () => {
            expect(getTldTrustLevel('192.168.1.1')).toBe('low');
        });
    });
});

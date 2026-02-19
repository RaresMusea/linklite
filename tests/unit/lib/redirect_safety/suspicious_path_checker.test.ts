import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/redirect_safety/redirect_safety', () => ({
    isAllowlisted: vi.fn(),
}));

vi.mock('@/lib/redirect_safety/tld_trust_level', () => ({
    hasLowTrustTld: vi.fn(),
    isNonAllowlistedTld: vi.fn(),
}));

import { isAllowlisted } from '@/lib/redirect_safety/redirect_safety';
import { hasLowTrustTld, isNonAllowlistedTld } from '@/lib/redirect_safety/tld_trust_level';
import { hasSuspiciousPath } from '@/lib/redirect_safety/suspicious_path_checker';

describe('hasSuspiciousPath', () => {
    const mockIsAllowlisted = vi.mocked(isAllowlisted);
    const mockHasLowTrustTld = vi.mocked(hasLowTrustTld);
    const mockIsNonAllowlistedTld = vi.mocked(isNonAllowlistedTld);

    beforeEach(() => {
        vi.clearAllMocks();

        // Default gate: non-allowlisted + unknown TLD -> threshold remains 4
        mockIsAllowlisted.mockReturnValue(false);
        mockHasLowTrustTld.mockReturnValue(false);
        mockIsNonAllowlistedTld.mockReturnValue(true);
    });

    it('returns true for invalid URLs', () => {
        expect(hasSuspiciousPath('not-a-valid-url')).toBe(true);
    });

    it('returns true when suspicious score reaches default threshold (4)', () => {
        // urgency + auth (+3) and one high-signal token (+2) => 5
        const url = 'https://evil.test/account-suspended/login/reset-password';
        expect(hasSuspiciousPath(url)).toBe(true);
    });

    it('returns false when suspicious score is below default threshold (4)', () => {
        // one high-signal token only => 2
        const url = 'https://evil.test/2fa';
        expect(hasSuspiciousPath(url)).toBe(false);
    });

    it('uses stricter threshold (6) for allowlisted domains', () => {
        mockIsAllowlisted.mockReturnValue(true);

        // score 4 -> below strict threshold
        const borderline = 'https://github.com/reset-password/2fa';
        expect(hasSuspiciousPath(borderline)).toBe(false);

        // add long URL bonus (+1) -> score 6
        const longTail = 'a'.repeat(230);
        const reachesStrictThreshold = `https://github.com/account-suspended/login/reset-password/${longTail}`;
        expect(hasSuspiciousPath(reachesStrictThreshold)).toBe(true);
    });

    it('uses stricter threshold (6) for high-trust TLDs', () => {
        mockHasLowTrustTld.mockReturnValue(false);
        mockIsNonAllowlistedTld.mockReturnValue(false); // high-trust

        // score 4 -> below strict threshold
        const borderline = 'https://example.com/reset-password/2fa';
        expect(hasSuspiciousPath(borderline)).toBe(false);

        // add encoded traversal pattern (+2) -> now >= 6
        const reachesStrictThreshold = 'https://example.com/account-suspended/login/reset-password/%2e%2e';
        expect(hasSuspiciousPath(reachesStrictThreshold)).toBe(true);
    });

    it('treats @ and dangerous encodings as high-signal structural obfuscation', () => {
        const url = 'https://evil.test/login%2f%2fverify@support';
        expect(hasSuspiciousPath(url)).toBe(true);
    });

    it('uses hostnameOverride for TLD trust checks', () => {
        const url = 'https://sub.example.com/account-suspended/login/reset-password';
        hasSuspiciousPath(url, 'Custom-HOST.Example');

        expect(mockHasLowTrustTld).toHaveBeenCalledWith('custom-host.example');
        expect(mockIsNonAllowlistedTld).toHaveBeenCalledWith('custom-host.example');
    });
});

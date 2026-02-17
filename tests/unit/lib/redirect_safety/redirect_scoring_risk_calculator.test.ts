import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainStatus } from '@/generated/prisma/enums';
import type { LinkRiskInput } from '@/dal/links/links.types';

vi.mock('@/lib/utils', () => ({
    isHttps: vi.fn(),
}));

vi.mock('@/lib/redirect_safety/domain_age_classifier', () => ({
    isNewDomain: vi.fn(),
}));

vi.mock('@/lib/redirect_safety/redirect_safety', () => ({
    isAllowlisted: vi.fn(),
}));

vi.mock('@/lib/redirect_safety/tld_trust_level', () => ({
    hasLowTrustTld: vi.fn(),
    isNonAllowlistedTld: vi.fn(),
}));

vi.mock('@/lib/redirect_safety/suspicious_path_checker', () => ({
    hasSuspiciousPath: vi.fn(),
}));

import { isHttps } from '@/lib/utils';
import { isNewDomain } from '@/lib/redirect_safety/domain_age_classifier';
import { isAllowlisted } from '@/lib/redirect_safety/redirect_safety';
import { hasLowTrustTld, isNonAllowlistedTld } from '@/lib/redirect_safety/tld_trust_level';
import { hasSuspiciousPath } from '@/lib/redirect_safety/suspicious_path_checker';
import {
    calculateRedirectRiskScoring,
    riskLevelFromScore,
} from '@/lib/redirect_safety/redirect_scoring_risk_calculator';

describe('riskLevelFromScore', () => {
    it('Returns high for scores at or above 5', () => {
        expect(riskLevelFromScore(5)).toBe('high');
        expect(riskLevelFromScore(10)).toBe('high');
    });

    it('Returns medium for scores from 3 up to 4.999...', () => {
        expect(riskLevelFromScore(3)).toBe('medium');
        expect(riskLevelFromScore(4.999)).toBe('medium');
    });

    it('Returns low for scores below 3', () => {
        expect(riskLevelFromScore(2.999)).toBe('low');
        expect(riskLevelFromScore(0)).toBe('low');
        expect(riskLevelFromScore(-1)).toBe('low');
    });
});

describe('calculateRedirectRiskScoring', () => {
    const mockIsHttps = vi.mocked(isHttps);
    const mockIsNewDomain = vi.mocked(isNewDomain);
    const mockIsAllowlisted = vi.mocked(isAllowlisted);
    const mockHasLowTrustTld = vi.mocked(hasLowTrustTld);
    const mockIsNonAllowlistedTld = vi.mocked(isNonAllowlistedTld);
    const mockHasSuspiciousPath = vi.mocked(hasSuspiciousPath);

    const domain = {
        hostname: 'example.com',
        registeredAt: new Date('2020-01-01T00:00:00.000Z'),
        status: DomainStatus.OK,
        checkedAt: new Date('2024-01-01T00:00:00.000Z'),
    };

    const baseInput: LinkRiskInput = {
        targetUrl: 'https://example.com/path',
        isShortener: false,
        hasRedirect: false,
        domain,
    };

    beforeEach(() => {
        vi.clearAllMocks();

        mockIsHttps.mockReturnValue(true);
        mockHasSuspiciousPath.mockReturnValue(false);
        mockHasLowTrustTld.mockReturnValue(false);
        mockIsNonAllowlistedTld.mockReturnValue(false);
        mockIsNewDomain.mockReturnValue(false);
        mockIsAllowlisted.mockReturnValue(true);
    });

    it('Returns low risk with score 0 when no signals are present', () => {
        const result = calculateRedirectRiskScoring(baseInput);

        expect(result).toEqual({
            level: 'low',
            score: 0,
            reasons: [],
        });
    });

    it('Adds missing_tld when domain is absent and skips domain-based checks', () => {
        const result = calculateRedirectRiskScoring({
            ...baseInput,
            domain: null,
        });

        expect(result).toEqual({
            level: 'low',
            score: 1,
            reasons: ['missing_tld'],
        });

        expect(mockHasLowTrustTld).not.toHaveBeenCalled();
        expect(mockIsNonAllowlistedTld).not.toHaveBeenCalled();
        expect(mockIsNewDomain).not.toHaveBeenCalled();
        expect(mockIsAllowlisted).not.toHaveBeenCalled();
    });

    it('Applies and orders all non-domain reasons correctly', () => {
        mockIsHttps.mockReturnValue(false);
        mockHasSuspiciousPath.mockReturnValue(true);

        const result = calculateRedirectRiskScoring({
            ...baseInput,
            isShortener: true,
            hasRedirect: true,
            redirectStatusCode: 302,
            domain: null,
        });

        expect(result).toEqual({
            level: 'high',
            score: 8,
            reasons: ['not_https', 'shortener', 'suspicious_path', 'temporary_redirect', 'missing_tld'],
        });
    });

    it('Adds temporary_redirect only for 302 with hasRedirect=true', () => {
        const with301 = calculateRedirectRiskScoring({
            ...baseInput,
            hasRedirect: true,
            redirectStatusCode: 301,
        });

        expect(with301.reasons).not.toContain('temporary_redirect');

        const withoutRedirect = calculateRedirectRiskScoring({
            ...baseInput,
            hasRedirect: false,
            redirectStatusCode: 302,
        });

        expect(withoutRedirect.reasons).not.toContain('temporary_redirect');

        const with302 = calculateRedirectRiskScoring({
            ...baseInput,
            hasRedirect: true,
            redirectStatusCode: 302,
        });

        expect(with302.reasons).toContain('temporary_redirect');
    });

    it('Uses tld_low_trust and not tld_unknown when low-trust check is true', () => {
        mockHasLowTrustTld.mockReturnValue(true);
        mockIsNonAllowlistedTld.mockReturnValue(true); // should not be evaluated

        const result = calculateRedirectRiskScoring(baseInput);

        expect(result.reasons).toContain('tld_low_trust');
        expect(result.reasons).not.toContain('tld_unknown');
        expect(mockIsNonAllowlistedTld).not.toHaveBeenCalled();
    });

    it('Uses tld_unknown when not low-trust but non-allowlisted', () => {
        mockHasLowTrustTld.mockReturnValue(false);
        mockIsNonAllowlistedTld.mockReturnValue(true);

        const result = calculateRedirectRiskScoring(baseInput);

        expect(result.reasons).toContain('tld_unknown');
        expect(result.reasons).not.toContain('tld_low_trust');
    });

    it('Adds domain_new and domain_not_allowlisted when applicable', () => {
        mockIsNewDomain.mockReturnValue(true);
        mockIsAllowlisted.mockReturnValue(false);

        const result = calculateRedirectRiskScoring(baseInput);

        expect(result).toEqual({
            level: 'low',
            score: 2,
            reasons: ['domain_new', 'domain_not_allowlisted'],
        });
    });

    it('Computes medium level correctly at score 3', () => {
        mockHasSuspiciousPath.mockReturnValue(true); // +2
        mockIsAllowlisted.mockReturnValue(false); // +1

        const result = calculateRedirectRiskScoring(baseInput);

        expect(result).toEqual({
            level: 'medium',
            score: 3,
            reasons: ['suspicious_path', 'domain_not_allowlisted'],
        });
    });

    it('Passes domain hostname override into suspicious path checker', () => {
        calculateRedirectRiskScoring(baseInput);

        expect(mockHasSuspiciousPath).toHaveBeenCalledWith(baseInput.targetUrl, domain.hostname);
    });
});

import { isHttps } from '@/lib/utils';
import { LinkRiskInput } from '@/dal/links/links.types';
import { isNewDomain } from '@/lib/redirect_safety/domain_age_classifier';
import { isAllowlisted } from '@/lib/redirect_safety/redirect_safety';
import { hasLowTrustTld, isNonAllowlistedTld } from '@/lib/redirect_safety/tld_trust_level';
import { hasSuspiciousPath } from '@/lib/redirect_safety/suspicious_path_checker';

type RedirectRiskLevel = 'low' | 'medium' | 'high';

export type RiskResult = {
    level: RedirectRiskLevel;
    score: number;
    reasons: RiskReason[];
    debug?: Record<string, unknown>;
};

export type RiskReason =
    | 'not_https'
    | 'shortener'
    | 'suspicious_path'
    | 'missing_tld'
    | 'tld_unknown'
    | 'tld_low_trust'
    | 'domain_not_allowlisted'
    | 'temporary_redirect'
    | 'domain_new';

export function riskLevelFromScore(score: number): RedirectRiskLevel {
    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
}

/**
 * Calculates the overall redirect risk score for a given link.
 *
 * This function represents the core risk evaluation engine for redirect analysis.
 * It aggregates multiple heuristic signals (transport security, redirect behavior,
 * domain reputation, TLD trust level, and path suspiciousness) into a single
 * numerical score and derives a corresponding risk level.
 *
 * The scoring model is additive:
 * - Each triggered rule contributes a predefined number of points.
 * - The final score is mapped to a risk level using `riskLevelFromScore`.
 *
 * Risk Levels:
 * - low: score < 3
 * - medium: score >= 3 and < 5
 * - high: score >= 5
 *
 * Scoring Rules:
 *
 * Transport & Redirect Behavior:
 * - not_https (+1) → URL uses HTTP instead of HTTPS
 * - shortener (+3) → Known URL shortener detected
 * - suspicious_path (+2) → Path/query contains phishing-like patterns
 * - temporary_redirect (+1) → Uses HTTP 302 (temporary redirect)
 *
 * Domain & TLD Signals:
 * - missing_tld (+1) → Domain information unavailable
 * - tld_low_trust (+1) → TLD is classified as low-trust
 * - tld_unknown (+1) → TLD not in high-trust allowlist
 * - domain_new (+1) → Domain recently registered
 * - domain_not_allowlisted (+1) → Domain not in trusted internal allowlist
 *
 * The function returns:
 * - total score
 * - derived risk level
 * - list of triggered risk reasons
 *
 * This function is deterministic and synchronous.
 * It does not perform network calls or external lookups.
 *
 * @param input - LinkRiskInput containing target URL, redirect metadata,
 *                and enriched domain information.
 *
 * @returns RiskResult object containing:
 *          - level: overall risk classification ("low" | "medium" | "high")
 *          - score: aggregated numeric risk score
 *          - reasons: list of triggered RiskReason identifiers
 */
export function calculateRedirectRiskScoring(input: LinkRiskInput): RiskResult {
    const reasons: RiskReason[] = [];
    let score = 0;

    if (!isHttps(input.targetUrl)) {
        score += 1;
        reasons.push('not_https');
    }

    if (input.isShortener) {
        score += 3;
        reasons.push('shortener');
    }

    if (hasSuspiciousPath(input.targetUrl, input.domain?.hostname)) {
        score += 2;
        reasons.push('suspicious_path');
    }

    if (input.hasRedirect && input.redirectStatusCode === 302) {
        score += 1;
        reasons.push('temporary_redirect');
    }

    if (!input.domain) {
        score += 1;
        reasons.push('missing_tld');
    } else {
        const hostname = input.domain.hostname;

        if (hasLowTrustTld(hostname)) {
            score += 1;
            reasons.push('tld_low_trust');
        } else if (isNonAllowlistedTld(hostname)) {
            score += 1;
            reasons.push('tld_unknown');
        }

        if (isNewDomain(input.domain)) {
            score += 1;
            reasons.push('domain_new');
        }

        if (!isAllowlisted(input.targetUrl)) {
            score += 1;
            reasons.push('domain_not_allowlisted');
        }
    }

    const level = riskLevelFromScore(score);

    return {
        level,
        score,
        reasons,
    };
}

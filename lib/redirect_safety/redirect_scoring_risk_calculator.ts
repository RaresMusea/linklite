import { isHttps } from '@/lib/utils';
import { LinkRiskInput } from '@/dal/links/links.types';
import { isNewDomain } from '@/lib/redirect_safety/domain_age_classifier';
import { isAllowlisted } from '@/lib/redirect_safety/redirect_safety';
import { hasLowTrustTld, isNonAllowlistedTld } from '@/lib/redirect_safety/tld_trust_level';
import { hasSuspiciousPath } from '@/lib/redirect_safety/suspicious_path_checker';
import { RiskContext, RiskSignal } from '@/lib/redirect_safety/redirect_safety_types';

type RedirectRiskLevel = 'low' | 'no_info' | 'medium' | 'high';
type Severity = 'none' | 'low' | 'medium' | 'high';

export type RiskResult = {
    level: RedirectRiskLevel; // trust/badge level
    severity: Severity; // popover severity
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
    if (score >= 1) return 'no_info';
    return 'no_info';
}

export function severityFromScore(score: number): Severity {
    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    if (score >= 1) return 'low';
    return 'none';
}


function shouldForceHigh(context: RiskContext): boolean {
    if (context.lowTrustTld && context.suspiciousPath) return true;

    if (context.lowTrustTld && context.newDomain) return true;

    if (!context.isHttps && context.suspiciousPath) return true;

    return context.isShortener && context.suspiciousPath;
}

/**
 * Evaluates the security risk of a redirect target using a heuristic scoring model.
 *
 * This function is the core redirect safety engine. It analyzes multiple signals
 * related to transport security, redirect behavior, domain characteristics,
 * TLD reputation, and URL structure in order to:
 *
 * 1. Compute a numeric risk score (additive model)
 * 2. Derive a severity level (none | low | medium | high)
 * 3. Derive a trust level (low | no_info | medium | high)
 *
 * ---------------------------------------------------------------------------
 * SCORING MODEL
 * ---------------------------------------------------------------------------
 *
 * The model is additive:
 * Each triggered signal contributes a fixed number of points.
 *
 * Transport & Redirect Signals:
 *  - not_https (+1)           → URL uses HTTP instead of HTTPS
 *  - shortener (+3)           → Known URL shortener detected
 *  - suspicious_path (+2)     → Path or query resembles phishing patterns
 *  - temporary_redirect (+1)  → HTTP 302 redirect detected
 *
 * Domain & TLD Signals:
 *  - missing_tld (+1)         → Domain metadata unavailable
 *  - tld_low_trust (+1)       → TLD classified as low trust
 *  - tld_unknown (+1)         → TLD not present in trusted allowlist
 *  - domain_new (+1)          → Recently registered domain
 *  - domain_not_allowlisted (+1) → Not in internal trusted allowlist
 *
 * ---------------------------------------------------------------------------
 * SEVERITY (Risk Intensity)
 * ---------------------------------------------------------------------------
 *
 * Severity is derived purely from the numeric score:
 *
 *  - none   → score === 0
 *  - low    → score 1–2
 *  - medium → score 3–4
 *  - high   → score >= 5
 *
 * Certain signal combinations may force severity to "high".
 *
 * ---------------------------------------------------------------------------
 * TRUST LEVEL (Badge Classification)
 * ---------------------------------------------------------------------------
 *
 * Trust level represents how safe the destination appears from a UX perspective.
 * It is distinct from severity.
 *
 *  - low      → Verified / Trusted (no risk signals + positive trust signal)
 *  - no_info  → Unverified (minimal or no negative signals, but no trust signal)
 *  - medium   → Moderate Risk
 *  - high     → High Risk (or forced high)
 *
 * Trust may be promoted to "low" (Verified) only when:
 *  - score === 0 AND
 *  - a positive trust signal exists (e.g., allowlisted or high-trust TLD)
 *
 * ---------------------------------------------------------------------------
 * FORCED HIGH LOGIC
 * ---------------------------------------------------------------------------
 *
 * Certain combinations of signals (e.g., low-trust TLD + suspicious path)
 * automatically escalate the result to "high" regardless of total score.
 *
 * ---------------------------------------------------------------------------
 * CHARACTERISTICS
 * ---------------------------------------------------------------------------
 *
 * - Deterministic and synchronous
 * - No external network calls
 * - Pure function (depends only on input)
 *
 * @param input - LinkRiskInput containing:
 *                - target URL
 *                - redirect metadata
 *                - enriched domain information
 *
 * @returns RiskResult:
 *          - level: trust classification for UI badge
 *          - severity: risk intensity classification
 *          - score: aggregated numeric risk score
 *          - reasons: list of triggered risk signals
 *          - debug: optional evaluation context (non-production use)
 */
export function calculateRedirectRiskScoring(input: LinkRiskInput): RiskResult {
    const url = input.targetUrl;
    const hostname = input.domain?.hostname;

    const hasDomain = Boolean(input.domain);
    const lowTrustTld = hostname ? hasLowTrustTld(hostname) : false;
    const unknownTld = hasDomain && hostname ? !lowTrustTld && isNonAllowlistedTld(hostname) : false;

    const ctx: RiskContext = {
        url,
        hostname,
        hasDomain,
        isHttps: isHttps(url),
        isShortener: input.isShortener,
        hasRedirect302: Boolean(input.hasRedirect && input.redirectStatusCode === 302),
        suspiciousPath: hasSuspiciousPath(url, hostname),
        lowTrustTld,
        unknownTld,
        newDomain: input.domain ? isNewDomain(input.domain) : false,
        allowlisted: isAllowlisted(url),
    };

    const signals: RiskSignal[] = [
        { id: 'not_https', points: 1, when: !ctx.isHttps },
        { id: 'shortener', points: 3, when: ctx.isShortener },
        { id: 'suspicious_path', points: 2, when: ctx.suspiciousPath },
        { id: 'temporary_redirect', points: 1, when: ctx.hasRedirect302 },
        { id: 'missing_tld', points: 1, when: !ctx.hasDomain },
        { id: 'tld_low_trust', points: 1, when: ctx.hasDomain && ctx.lowTrustTld },
        { id: 'tld_unknown', points: 1, when: ctx.hasDomain && ctx.unknownTld },
        { id: 'domain_new', points: 1, when: ctx.hasDomain && ctx.newDomain },
        { id: 'domain_not_allowlisted', points: 1, when: ctx.hasDomain && !ctx.allowlisted },
    ];

    const reasons: RiskReason[] = [];
    let score = 0;

    for (const s of signals) {
        if (!s.when) continue;
        score += s.points;
        reasons.push(s.id);
    }

    let severity = severityFromScore(score);
    let level = riskLevelFromScore(score);

    // score 0 => "none" severity + optional promote to Verified
    if (score === 0) {
        severity = 'none';
        const highTrustTld = hasDomain && hostname ? !lowTrustTld && !unknownTld : false;
        const trustedByPolicy = ctx.allowlisted || highTrustTld;
        level = trustedByPolicy ? 'low' : 'no_info';
    }

    // force-high should win
    if (shouldForceHigh(ctx)) {
        level = 'high';
        severity = 'high';
    }

    return {
        level,
        severity,
        score,
        reasons,
        debug: { ctx },
    };
}

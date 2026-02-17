import { RiskReason } from '@/lib/redirect_safety/redirect_scoring_risk_calculator';

export const RISK_REASON_LABEL: Record<RiskReason, string> = {
    not_https: 'Connection is not secure (HTTP)',
    shortener: 'Uses a URL shortener',
    suspicious_path: 'The URL contains a suspicious path or query',
    missing_tld: 'Domain information unavailable',
    tld_unknown: 'Uncommon or unrecognized top-level domain',
    tld_low_trust: 'Low-trust top-level domain',
    domain_not_allowlisted: 'Domain not in trusted allowlist',
    temporary_redirect: 'URL uses temporary redirect',
    domain_new: 'Domain registered recently',
};

import { isAllowlisted } from '@/lib/redirect_safety/redirect_safety';
import { hasLowTrustTld, isNonAllowlistedTld } from '@/lib/redirect_safety/tld_trust_level';

const SUSPICIOUS_KEYWORDS = [
    // === FINANCIAL/BANKING ===
    'bank',
    'banks',
    'banking',
    'paypal',
    'pay-pal',
    'paypal-secure',
    'westernunion',
    'moneygram',
    'visa',
    'mastercard',
    'amex',
    'americanexpress',
    'transferwise',
    'wise',
    'revolut',
    'skrill',
    'neteller',
    'crypto',
    'bitcoin',
    'btc',
    'ethereum',
    'wallet',
    'blockchain',
    'coinbase',
    'binance',
    'kucoin',
    'pay',
    'payment',
    'payments',
    'credit',
    'debit',
    'card',
    'cards',
    'finance',
    'financial',
    'loans',
    'loan',
    'refund',
    'refunds',
    'tax',
    'taxes',
    'irs',
    'invoice',
    'invoices',
    'billing',
    'transaction',
    'transactions',
    'withdraw',
    'withdrawal',
    'deposit',

    // === ACCOUNT SECURITY ===
    'login',
    'log-in',
    'signin',
    'sign-in',
    'verify',
    'verification',
    'verify-account',
    'account',
    'accounts',
    'myaccount',
    'secure',
    'security',
    'secured',
    'confirm',
    'confirmation',
    'password',
    'passwords',
    'reset-password',
    'reset',
    'reset-account',
    'auth',
    'authentication',
    '2fa',
    'twofactor',
    'recover',
    'recovery',
    'account-recovery',
    'unlock',
    'unlock-account',
    'restore',
    'restore-account',
    'validate',
    'validation',
    'identity',
    'id-verify',
    'id-verification',
    'kyc',
    'knowyourcustomer',

    // === ALERTS & URGENCY ===
    'alert',
    'alerts',
    'warning',
    'warnings',
    'suspended',
    'suspension',
    'blocked',
    'blocking',
    'locked',
    'lock',
    'restricted',
    'restriction',
    'limited',
    'limitation',
    'expire',
    'expired',
    'expiration',
    'terminated',
    'termination',
    'deactivated',
    'deactivation',
    'disabled',
    'disable',
    'unusual',
    'unusual-activity',
    'suspicious',
    'suspicious-activity',
    'unauthorized',
    'unauthorized-access',
    'fraud',
    'fraud-alert',
    'risk',
    'high-risk',
    'review',
    'under-review',
    'hold',
    'on-hold',

    // === EMAIL/COMMUNICATION ===
    'inbox',
    'mail',
    'webmail',
    'outlook',
    'hotmail',
    'live',
    'gmail',
    'googlemail',
    'yahoo',
    'ymail',
    'aol',
    'aim',
    'protonmail',
    'proton',
    'message',
    'messages',
    'notification',
    'notifications',

    // === SUPPORT/HELPDESK ===
    'support',
    'help',
    'helpdesk',
    'customer-service',
    'customerservice',
    'service',
    'services',
    'contact',
    'contact-us',

    // === TECH/DOCUMENTS ===
    'update',
    'updates',
    'upgrade',
    'download',
    'downloads',
    'file',
    'files',
    'document',
    'documents',
    'pdf',
    'doc',
    'xls',
    'attachment',
    'attachments',
    'scan',
    'scanned',
    'scanner',
    'photo',
    'photos',
    'picture',
    'pictures',
    'image',
    'images',
    'gallery',

    // === SHIPPING/DELIVERY ===
    'dhl',
    'fedex',
    'ups',
    'usps',
    'track',
    'tracking',
    'track-package',
    'delivery',
    'shipment',
    'shipping',
    'courier',
    'parcel',
    'package',

    // === SOCIAL MEDIA ===
    'facebook',
    'fb',
    'instagram',
    'ig',
    'twitter',
    'x',
    'tweet',
    'linkedin',
    'whatsapp',
    'wa',
    'telegram',
    'tiktok',
    'snapchat',
    'snap',
    'discord',
    'slack',
    'youtube',
    'yt',

    // === CLOUD/STORAGE ===
    'dropbox',
    'drive',
    'onedrive',
    'icloud',
    'cloud',
    'sharepoint',
    'box',
    'transfer',
    'wetransfer',

    // === ADMIN/INTERNAL ===
    'admin',
    'administrator',
    'webmaster',
    'web-admin',
    'cpanel',
    'whm',
    'backend',
    'backoffice',
    'dashboard',
    'controlpanel',
    'server',
    'hosting',
    'plesk',
    'directadmin',

    // === COMMON PHISHING PATTERNS ===
    'authenticate',
    'authentication',
    'credential',
    'credentials',
    'verif',
    'verif-account',
    'confirm-identity',
    'protect',
    'protection',
    'privacy',
    'privacy-policy',
    'terms',
    'terms-of-service',
    'legal',
    'compliance',
    'docusign',
    'esignature',
    'contract',
    'agreement',

    // === ROMANIAN-SPECIFIC (având în vedere că ai .ro în high trust) ===
    'ing',
    'brd',
    'bcr',
    'bt',
    'cec',
    'raiffeisen',
    'unicredit',
    'otp',
    'anaf',
    'cnp',
    'buletin',
    'carte-identitate',
    'contract-lumina',
    'contract-gaz',
    'enel',
    'e-on',
    'orange',
    'vodafone',
    'telekom',
    'digi',
    'paypoint',
    'selfpay',
    'ghiseul',
    'ghiseul-ro',
    'impozite',
    'taxe-locale',
    'itm',
    'anofm',
    'cas',
];

const HIGH_SIGNAL_TOKENS = new Set([
    'reset',
    'resetpassword',
    'reset-password',
    'verify',
    'verification',
    'verifyaccount',
    'verify-account',
    'recovery',
    'recover',
    'accountrecovery',
    'account-recovery',
    'unlock',
    'unlockaccount',
    'unlock-account',
    'credential',
    'credentials',
    'twofactor',
    '2fa',
    'kyc',
    'id',
    'identity',
    'idverification',
    'id-verification',
]);

const URGENCY_TOKENS = new Set([
    'suspended',
    'locked',
    'restricted',
    'limited',
    'disabled',
    'deactivated',
    'terminated',
    'unusual',
    'unauthorized',
    'fraud',
    'risk',
    'alert',
    'warning',
    'blocked',
    'expire',
    'expired',
]);

const AUTH_TOKENS = new Set(['login', 'signin', 'sign-in', 'log-in', 'auth', 'authentication', 'password']);

/**
 * Determines whether a URL's *path + query* looks suspicious (phishing/scam-style patterns).
 *
 * This is a **local heuristic** used to decide whether to trigger the global `suspicious_path`
 * reason in the redirect risk engine. It does **not** compute the overall risk level; it only
 * returns a boolean signal that the caller can translate into points/reasons.
 *
 * How it works (high level):
 * 1) Parses the URL. If parsing fails, it returns `true` (invalid URLs are treated as suspicious).
 * 2) Extracts `pathname + search`, normalizes and tokenizes it (lowercase, decodeURIComponent,
 *    non-alphanumerics -> spaces).
 * 3) Computes an internal suspicion score using weighted heuristics:
 *    - "urgency" tokens (e.g. suspended/locked/fraud) + "auth" tokens (login/password/auth) combo
 *    - high-signal tokens (reset-password, verify-account, credential, 2fa, kyc, etc.)
 *    - structural obfuscation signals (very long URL, too many path segments, dangerous encodings,
 *      '@' userinfo trick)
 *    - keyword density from SUSPICIOUS_KEYWORDS as a weak signal (2+ hits, 5+ hits)
 * 4) Uses an **adaptive threshold**:
 *    - base threshold = 4
 *    - stricter threshold = 6 if the domain is allowlisted OR the TLD is high-trust
 *      (reduces false positives for common legit paths like "/login", "/support", etc.)
 * 5) Returns `true` if internal score >= threshold.
 *
 * Notes:
 * - `hostnameOverride` should be a **hostname** (e.g. "example.com"), typically from DB domain info.
 *   If omitted, hostname is extracted from the URL.
 * - Gating relies on `isAllowlisted(...)` and TLD trust helpers. If your TLD helpers treat
 *   "cannot parse suffix" as low-trust, you'll get more false positives; prefer treating
 *   parse failures as "unknown".
 *
 * @param url - Full URL to inspect (must include protocol for URL parsing).
 * @param hostnameOverride - Optional hostname to use for allowlist/TLD gating instead of URL hostname.
 * @returns `true` if the URL path/query is suspicious enough to trigger `suspicious_path`.
 */
export function hasSuspiciousPath(url: string, hostnameOverride?: string): boolean {
    let u: URL;

    try {
        u = new URL(url);
    } catch {
        return true; // Invalid URL leads automatically to the idea of a suspicious URL
    }

    const pathAndQuery = `${u.pathname} ${u.search}`;
    const tokens = toTokenSet(pathAndQuery);

    let score = 0;

    const hasUrgency = [...URGENCY_TOKENS].some((t) => tokens.has(t));
    const hasAuth = [...AUTH_TOKENS].some((t) => tokens.has(t));

    if (hasUrgency && hasAuth) score += 3;

    const highSignalHits = [...HIGH_SIGNAL_TOKENS].filter((t) => tokens.has(t)).length;
    if (highSignalHits >= 1) score += 2;
    if (highSignalHits >= 2) score += 1;

    const urlStr = url;
    if (urlStr.length > 220) score += 1;

    const segments = u.pathname.split('/').filter(Boolean);
    if (segments.length > 7) score += 1;

    if (/%00|%2e%2e|%2f%2f|%5c/i.test(urlStr)) score += 2;

    if (urlStr.includes('@')) score += 2;

    const vocabHits = SUSPICIOUS_KEYWORDS.filter((k) => {
        const kt = normalizeForTokens(k).replace(/\s+/g, '');
        return tokens.has(kt) || tokens.has(kt.replace(/-/g, ''));
    }).length;

    if (vocabHits >= 2) score += 1;
    if (vocabHits >= 5) score += 1;

    let threshold = 4;

    const hostname = (hostnameOverride ?? u.hostname).toLowerCase();
    const isAllow = isAllowlisted(url) ?? false;
    const isLowTld = hasLowTrustTld(hostname);
    const isUnknownTld = isNonAllowlistedTld(hostname);
    const isHighTld = !isLowTld && !isUnknownTld;

    if (isAllow || isHighTld) threshold = 6;

    return score >= threshold;
}

function toTokenSet(s: string): Set<string> {
    const norm = normalizeForTokens(s);
    const tokens = norm.split(/\s+/).filter(Boolean);
    return new Set(tokens);
}

function normalizeForTokens(s: string): string {
    // lowercase + decode safe + replace separators with spaces
    const lower = s.toLowerCase();
    let decoded = lower;
    try {
        decoded = decodeURIComponent(lower);
    } catch {}
    return decoded
        .replace(/[+]/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

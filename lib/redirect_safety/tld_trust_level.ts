import { getPublicSuffix } from 'tldts';

const LOW_TRUST_SUFFIXES = new Set([
    // Existing
    'tk',
    'ml',
    'ga',
    'cf',
    'gq',

    // Known free/cheap TLDs often abused
    'xyz',
    'top',
    'club',
    'online',
    'site',
    'website',
    'space',
    'press',
    'live',
    'shop',
    'store',
    'bid',
    'trade',
    'webcam',
    'review',
    'date',
    'download',
    'stream',
    'racing',
    'win',
    'bet',
    'click',
    'work',
    'loan',
    'men',
    'party',
    'science',
    'tech',
    'support',
    'mom',
    'lol',
    'gq',
    'cf',
    'ml',
    'tk',
    'ga',
    'cx',
    'pw',
    'info',

    // Suspicious country TLDs with low moderation
    'cm',
    'ng',
    'ke',
    'ug',
    'zw',
    'mw',
    'mu',
    'sc',
    'tz',
    'pk',
    'bd',
    'lk',
    'np',
    'mm',
    'kh',
    'la',
    'by',
    'kg',
    'tj',
    'tm',
    'uz',
    'az',
    'am',
    'vu',
    'ws',
    'tv',
    'cc',
    'pw',

    // Commonly abused for spam/phishing
    'cam',
    'faith',
    'gdn',
    'men',
    'rest',
    'download',
    'country',
    'science',
    'kim',
    'pro',
    'bar',
]);

const HIGH_TRUST_SUFFIXES = new Set([
    // Existing
    'com',
    'net',
    'org',
    'ro',
    'de',
    'fr',
    'it',
    'es',
    'nl',
    'se',
    'no',
    'dk',
    'fi',
    'pl',
    'cz',
    'hu',
    'at',
    'ch',
    'be',
    'ie',
    'pt',
    'gr',
    'uk',
    'co.uk',
    'dev',
    'app',
    'io',

    // Major established TLDs
    'gov',
    'edu',
    'mil',
    'co',
    'eu',
    'asia',

    // Additional European countries
    'lu',
    'mt',
    'si',
    'sk',
    'bg',
    'hr',
    'lt',
    'lv',
    'ee',
    'is',
    'li',
    'mc',
    'ad',
    'sm',
    'va',

    // Other developed countries
    'jp',
    'kr',
    'sg',
    'hk',
    'tw',
    'au',
    'nz',
    'ca',
    'ae',
    'il',
    'sa',
    'qa',
    'kw',
    'cl',
    'br',
    'ar',
    'mx',

    // Common professional/business TLDs
    'biz',
    'info',
    'me',
    'name',

    // Industry-specific trusted TLDs
    'tech',
    'software',
    'cloud',
    'digital',
    'bank',
    'insurance',
    'healthcare',
    'gov',
    'edu',
    'ac.uk',
    'edu.au',

    // Popular gTLDs with good reputation
    'design',
    'agency',
    'consulting',
    'solutions',
    'management',
    'systems',
    'services',
    'email',
    'media',
    'news',
]);

export function hasLowTrustTld(hostname: string): boolean {
    const suffix = getPublicSuffix(hostname);
    if (!suffix) return true; // cannot parse => risk
    return LOW_TRUST_SUFFIXES.has(suffix);
}

export function isNonAllowlistedTld(hostname: string): boolean {
    const suffix = getPublicSuffix(hostname);
    if (!suffix) return true;
    return !HIGH_TRUST_SUFFIXES.has(suffix);
}

export type TldTrustLevel = 'high' | 'unknown' | 'low';

export function getTldTrustLevel(hostname: string): TldTrustLevel {
    if (hasLowTrustTld(hostname)) return 'low';
    if (isNonAllowlistedTld(hostname)) return 'unknown';
    return 'high';
}

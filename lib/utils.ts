import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { isPlainObject } from '@/lib/guards';
import { ApiRouteResponse } from '@/lib/types';
import { toASCII } from 'punycode';
import { parse } from 'tldts';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function isApiRouteResponseOf<T>(x: unknown, isData: (v: unknown) => v is T): x is ApiRouteResponse<T> {
    if (!isPlainObject(x)) return false;
    if (typeof x.success !== 'boolean') return false;

    if (x.success) return 'data' in x && isData(x.data);

    return 'error' in x && typeof x.error === 'string' && (x.status === undefined || typeof x.status === 'number');
}

export function generateSlug(length = 6): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let slug: string = '';

    for (let i = 0; i < length; i++) {
        slug += chars[Math.floor(Math.random() * chars.length)];
    }

    return slug;
}

const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;
const TRAILING_DOTS_RE = /\.+$/;
const WWW_RE = /^www\./;

// IPv4: permissive
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;
// IPv6 (no brackets). This is a pragmatic check, not a full RFC validator.
const IPV6_RE = /^[0-9a-f:]+$/i;

/**
 * Normalizes and validates a hostname extracted from a URL.
 *
 * Features:
 * - Accepts URLs with or without protocol (`https://example.com`, `example.com`)
 * - Removes `www.` prefix and trailing dots
 * - Converts Internationalized Domain Names (IDN) to punycode
 * - Supports IPv4, IPv6 (without brackets), and `localhost`
 * - Rejects invalid or garbage hostnames
 *
 * @param input URL or hostname provided by the user
 * @returns Normalized hostname, or `null` if the input is invalid
 *
 * @example
 * normalizeHostnameFromUrl('https://www.Example.COM.')
 * // → 'example.com'
 *
 * @example
 * normalizeHostnameFromUrl('example.com')
 * // → 'example.com'
 *
 * @example
 * normalizeHostnameFromUrl('not-a-valid-url')
 * // → null
 *
 * @example
 * normalizeHostnameFromUrl('https://[2001:db8::1]')
 * // → '2001:db8::1'
 */
export function normalizeHostnameFromUrl(input: string): string | null {
    const raw = input ?? '';
    const cleaned = raw.trim().replace(/\s+/g, '');

    if (!cleaned) {
        console.error(`Unknown hostname from URL: ${raw}`);
        return null;
    }

    // If there is no scheme, assume https:// so URL() can parse it.
    const candidate = SCHEME_RE.test(cleaned) ? cleaned : `https://${cleaned}`;

    let hostname: string;
    try {
        const u = new URL(candidate);
        hostname = (u.hostname || '').toLowerCase();
    } catch {
        console.error(`Unknown hostname from URL: ${raw}`);
        return null;
    }

    // Remove trailing dots (DNS canonical form sometimes ends with a dot)
    hostname = hostname.replace(TRAILING_DOTS_RE, '');

    // Canonicalize www.
    hostname = hostname.replace(WWW_RE, '');

    if (!hostname) {
        console.error(`Unknown hostname from URL: ${raw}`);
        return null;
    }

    // Fast-path: IPs + localhost (do NOT run through punycode)
    const isIPv4 = IPV4_RE.test(hostname);
    const isIPv6 = IPV6_RE.test(hostname) && hostname.includes(':');
    const isLocalhost = hostname === 'localhost';

    if (isIPv4 || isIPv6 || isLocalhost) {
        return hostname;
    }

    // Domain validation: require at least one dot to avoid garbage like "not-a-valid-url"
    // If you want to allow single-label hostnames, remove this.
    if (!hostname.includes('.')) {
        console.error(`Unknown hostname from URL: ${raw}`);
        return null;
    }

    // IDN -> punycode (safe for ASCII too)
    const ascii = toASCII(hostname);

    // Final sanity check (after punycode)
    if (!ascii || !ascii.includes('.')) {
        console.error(`Unknown hostname from URL: ${raw}`);
        return null;
    }

    return ascii;
}

export function getTld(hostname: string): string | null {
    // IPs & localhost → no TLD
    if (hostname === 'localhost') return null;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return null;
    if (/^[0-9a-f:]+$/i.test(hostname)) return null;

    const parts = hostname.split('.');
    if (parts.length < 2) return null;

    return parts[parts.length - 1];
}

export function getRegistrableDomain(hostname: string): string | null {
    const res = parse(hostname, { allowPrivateDomains: true });
    // res.domain = registrable domain (ex: example.co.uk, example.com)
    return res.domain ?? null;
}

export function getPublicSuffix(hostname: string): string | null {
    const res = parse(hostname, { allowPrivateDomains: true });
    // ex: "com", "ro", "co.uk"
    return res.publicSuffix ?? null;
}

export function isHttps(url: string): boolean {
    try {
        return new URL(url).protocol === 'https:';
    } catch {
        return false;
    }
}

export function getEnvNumber(name: string, defaultValue?: number): number {
    const value = process.env[name];

    if (value === undefined || value === '') {
        if (defaultValue !== undefined) return defaultValue;
        throw new Error(`Missing required env var: ${name}`);
    }

    const parsed = Number(value);

    if (Number.isNaN(parsed)) {
        throw new Error(`Invalid number for env var ${name}: ${value}`);
    }

    return parsed;
}

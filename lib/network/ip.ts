import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

export function hashIp(ip: string | null) {
    if (!ip) return null;
    const salt = process.env.IP_HASH_SALT;

    if (!salt) return null;
    return createHash('sha256').update(`${ip}:${salt}`).digest('hex');
}

export function isValidIp(ip: string): boolean {
    return isIP(ip.trim()) !== 0; // 0 = invalid, 4 = IPv4, 6 = IPv6
}

export function getClientIp(h: Headers): string | null {
    // Cloudflare (best when proxied)
    const cf = h.get('cf-connecting-ip');
    if (cf) {
        const v = cf.trim();
        if (isValidIp(v)) return v;
    }

    // Standard chain: "client, proxy1, proxy2"
    const xff = h.get('x-forwarded-for');
    if (xff) {
        const first = xff.split(',')[0]?.trim();
        if (first && isValidIp(first)) return first;
    }

    // nginx/ingress sometimes sets this
    const xri = h.get('x-real-ip');
    if (xri) {
        const v = xri.trim();
        if (isValidIp(v)) return v;
    }

    return null;
}
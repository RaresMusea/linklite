import { createHash } from 'node:crypto';

export function hashIp(ip: string | null) {
    if (!ip) return null;
    const salt = process.env.IP_HASH_SALT;

    if (!salt) return null;
    return createHash('sha256').update(`${ip}:${salt}`).digest('hex');
}
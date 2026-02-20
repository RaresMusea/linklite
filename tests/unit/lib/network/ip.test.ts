import { afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { hashIp } from '@/lib/network/ip';

const originalSalt = process.env.IP_HASH_SALT;

afterEach(() => {
    if (originalSalt === undefined) {
        delete process.env.IP_HASH_SALT;
        return;
    }

    process.env.IP_HASH_SALT = originalSalt;
});

describe('hashIp tests', () => {
    it('returns null when ip is null', () => {
        process.env.IP_HASH_SALT = 'test-salt';

        expect(hashIp(null)).toBeNull();
    });

    it('Returns null when ip is empty string', () => {
        process.env.IP_HASH_SALT = 'test-salt';

        expect(hashIp('')).toBeNull();
    });

    it('Returns null when salt is missing', () => {
        delete process.env.IP_HASH_SALT;

        expect(hashIp('1.2.3.4')).toBeNull();
    });

    it('Returns deterministic sha256 hash for ip and salt', () => {
        process.env.IP_HASH_SALT = 'test-salt';

        const expected = createHash('sha256').update('1.2.3.4:test-salt').digest('hex');

        expect(hashIp('1.2.3.4')).toBe(expected);
    });

    it('Returns different hashes when salt changes', () => {
        process.env.IP_HASH_SALT = 'salt-a';
        const hashA = hashIp('1.2.3.4');

        process.env.IP_HASH_SALT = 'salt-b';
        const hashB = hashIp('1.2.3.4');

        expect(hashA).not.toBeNull();
        expect(hashB).not.toBeNull();
        expect(hashA).not.toBe(hashB);
    });
});

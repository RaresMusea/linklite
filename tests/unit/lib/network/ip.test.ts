import { afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { getClientIp, hashIp, isValidIp } from '@/lib/network/ip';

const originalSalt = process.env.IP_HASH_SALT;

afterEach(() => {
    if (originalSalt === undefined) {
        delete process.env.IP_HASH_SALT;
        return;
    }

    process.env.IP_HASH_SALT = originalSalt;
});

describe('IP utils unit tests', () => {
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

    describe('isValidIp tests', () => {
        it('returns true for valid IPv4', () => {
            expect(isValidIp('1.2.3.4')).toBe(true);
        });

        it('returns true for valid IPv6', () => {
            expect(isValidIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
        });

        it('returns true for valid ip with surrounding spaces', () => {
            expect(isValidIp('  127.0.0.1  ')).toBe(true);
        });

        it('returns false for invalid IPv4', () => {
            expect(isValidIp('999.1.1.1')).toBe(false);
        });

        it('returns false for invalid IPv6', () => {
            expect(isValidIp('2001:::7334')).toBe(false);
        });

        it('returns false for hostname', () => {
            expect(isValidIp('example.com')).toBe(false);
        });

        it('returns false for empty string', () => {
            expect(isValidIp('')).toBe(false);
        });
    });

    describe('getClientIp tests', () => {
        it('Returns cf-connecting-ip when valid', () => {
            const headers = new Headers({
                'cf-connecting-ip': '1.2.3.4',
                'x-forwarded-for': '5.6.7.8',
                'x-real-ip': '9.10.11.12',
            });

            expect(getClientIp(headers)).toBe('1.2.3.4');
        });

        it('falls back to first x-forwarded-for entry', () => {
            const headers = new Headers({
                'x-forwarded-for': '5.6.7.8, 10.0.0.1',
                'x-real-ip': '9.10.11.12',
            });

            expect(getClientIp(headers)).toBe('5.6.7.8');
        });

        it('Fails back to x-real-ip when x-forwarded-for is invalid', () => {
            const headers = new Headers({
                'x-forwarded-for': 'not-an-ip, 10.0.0.1',
                'x-real-ip': '9.10.11.12',
            });

            expect(getClientIp(headers)).toBe('9.10.11.12');
        });

        it('Trims spaces around candidate values', () => {
            const headers = new Headers({
                'x-forwarded-for': '  5.6.7.8  , 10.0.0.1',
            });

            expect(getClientIp(headers)).toBe('5.6.7.8');
        });

        it('Returns null when all headers are missing', () => {
            const headers = new Headers();

            expect(getClientIp(headers)).toBeNull();
        });

        it('Returns null when all header candidates are invalid', () => {
            const headers = new Headers({
                'cf-connecting-ip': 'bad-ip',
                'x-forwarded-for': 'also-bad,still-bad',
                'x-real-ip': 'not-valid',
            });

            expect(getClientIp(headers)).toBeNull();
        });
    });
});

import { describe, it, expect } from 'vitest';
import { isPrivateHost } from '@/lib/redirect_safety/redirect_proble';

describe('Is private host', () => {
    it('Should return true for private IPv4 ranges', () => {
        expect(isPrivateHost('10.0.0.1')).toBe(true);
        expect(isPrivateHost('172.16.0.1')).toBe(true);
        expect(isPrivateHost('192.168.1.1')).toBe(true);
    });

    it('Should return true for loopback and link-local addresses', () => {
        expect(isPrivateHost('127.0.0.1')).toBe(true);
        expect(isPrivateHost('169.254.10.20')).toBe(true);
    });

    it('Should return false for public IPv4 addresses', () => {
        expect(isPrivateHost('8.8.8.8')).toBe(false);
        expect(isPrivateHost('1.1.1.1')).toBe(false);
    });

    it('Should return true for private/loopback IPv6 addresses', () => {
        expect(isPrivateHost('::1')).toBe(true);
        expect(isPrivateHost('fd00::1')).toBe(true);
        expect(isPrivateHost('fe80::1')).toBe(true);
    });

    it('Should return false for public IPv6 addresses', () => {
        expect(isPrivateHost('2001:4860:4860::8888')).toBe(false);
    });

    it('Should return false for non-IP hostnames or invalid values', () => {
        expect(isPrivateHost('example.com')).toBe(false);
        expect(isPrivateHost('not-an-ip')).toBe(false);
        expect(isPrivateHost('')).toBe(false);
    });
});

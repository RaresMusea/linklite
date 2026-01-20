import { describe, beforeEach, it, vi, expect, Mock } from 'vitest';
import { getTld } from '@/lib/utils';
import { getRdapUrl } from '@/lib/rdap/rdap.endpoints';

vi.mock('@/lib/utils', () => ({
    getTld: vi.fn(),
}));

describe('getRdapUrl', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return null for domains with unsupported TLDs', () => {
        (getTld as Mock).mockReturnValue('gov');
        expect(getRdapUrl('example.gov')).toBeNull();

        (getTld as Mock).mockReturnValue('mil');
        expect(getRdapUrl('army.mil')).toBeNull();

        (getTld as Mock).mockReturnValue('edu');
        expect(getRdapUrl('harvard.edu')).toBeNull();
    });

    it('should return null for unknown TLDs', () => {
        (getTld as Mock).mockReturnValue('xyz');
        expect(getRdapUrl('example.xyz')).toBeNull();

        (getTld as Mock).mockReturnValue('unknown');
        expect(getRdapUrl('test.unknown')).toBeNull();
    });

    it('should return null when getTld returns null', () => {
        (getTld as Mock).mockReturnValue(null);
        expect(getRdapUrl('localhost')).toBeNull();
        expect(getRdapUrl('192.168.1.1')).toBeNull();
    });

    it('should return correct RDAP URL for .com domains', () => {
        (getTld as Mock).mockReturnValue('com');
        const result = getRdapUrl('example.com');
        expect(result).toBe('https://rdap.verisign.com/com/v1/domain/example.com');
    });

    it('should return correct RDAP URL for .net domains', () => {
        (getTld as Mock).mockReturnValue('net');
        const result = getRdapUrl('example.net');
        expect(result).toBe('https://rdap.verisign.com/net/v1/domain/example.net');
    });

    it('should return correct RDAP URL for .org domains', () => {
        (getTld as Mock).mockReturnValue('org');
        const result = getRdapUrl('example.org');
        expect(result).toBe('https://rdap.publicinterestregistry.org/rdap/domain/example.org');
    });

    it('should return correct RDAP URL for .dev domains', () => {
        (getTld as Mock).mockReturnValue('dev');
        const result = getRdapUrl('example.dev');
        expect(result).toBe('https://rdap.registry.google/rdap/domain/example.dev');
    });

    it('should return correct RDAP URL for .uk domains', () => {
        (getTld as Mock).mockReturnValue('uk');
        const result = getRdapUrl('example.co.uk');
        expect(result).toBe('https://rdap.nominet.uk/domain/example.co.uk');
    });

    it('should URL encode domain names with special characters', () => {
        (getTld as Mock).mockReturnValue('com');
        const result = getRdapUrl('exämple.com');
        expect(result).toBe('https://rdap.verisign.com/com/v1/domain/ex%C3%A4mple.com');
    });

    it('should handle subdomains correctly', () => {
        (getTld as Mock).mockReturnValue('com');
        const result = getRdapUrl('sub.example.com');
        expect(result).toBe('https://rdap.verisign.com/com/v1/domain/sub.example.com');
    });

    it('should handle domains with multiple subdomains', () => {
        (getTld as Mock).mockReturnValue('uk');
        const result = getRdapUrl('deep.nested.example.co.uk');
        expect(result).toBe('https://rdap.nominet.uk/domain/deep.nested.example.co.uk');
    });

    it('should return correct RDAP URL for .ro domains', () => {
        (getTld as Mock).mockReturnValue('ro');
        const result = getRdapUrl('example.ro');
        expect(result).toBe('https://rdap.rotld.ro/rdap/domain/example.ro');
    });

    it('should return correct RDAP URL for .in domains', () => {
        (getTld as Mock).mockReturnValue('in');
        const result = getRdapUrl('example.in');
        expect(result).toBe('https://rdap.registry.in/rdap/domain/example.in');
    });

    it('should return correct RDAP URL for .cn domains', () => {
        (getTld as Mock).mockReturnValue('cn');
        const result = getRdapUrl('example.cn');
        expect(result).toBe('https://rdap.conac.cn/rdap/domain/example.cn');
    });
});

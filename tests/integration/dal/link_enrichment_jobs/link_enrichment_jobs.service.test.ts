import { describe, it, expect } from 'vitest';
import { isPrivateOrLocalhost } from '@/dal/link_enrichment_jobs/link_enrichment_jobs.service';

describe('Link Enrichment Jobs service integration tests', () => {
    describe('Is private or localhost', () => {
        it('Should return true for localhost and .localhost subdomains', () => {
            expect(isPrivateOrLocalhost('localhost')).toBe(true);
            expect(isPrivateOrLocalhost('api.localhost')).toBe(true);
            expect(isPrivateOrLocalhost('LOCALHOST')).toBe(true);
        });

        it('Should return true for private IP addresses', () => {
            expect(isPrivateOrLocalhost('10.0.0.1')).toBe(true);
            expect(isPrivateOrLocalhost('192.168.1.1')).toBe(true);
            expect(isPrivateOrLocalhost('fd00::1')).toBe(true);
        });

        it('Should return false for public hosts', () => {
            expect(isPrivateOrLocalhost('8.8.8.8')).toBe(false);
            expect(isPrivateOrLocalhost('example.com')).toBe(false);
            expect(isPrivateOrLocalhost('2001:4860:4860::8888')).toBe(false);
        });
    });
});

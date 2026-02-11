import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isPrivateOrLocalhost } from '@/dal/link_enrichment_jobs/link_enrichment_jobs.service';
import { isPrivateHost } from '@/lib/redirect_safety/redirect_probe';

vi.mock('@/lib/redirect_safety/redirect_probe', () => ({
    isPrivateHost: vi.fn(),
}));

describe('Link Enrichment Jobs service tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Is private or localhost', () => {
        it('Should return true for localhost and .localhost subdomains', () => {
            expect(isPrivateOrLocalhost('localhost')).toBe(true);
            expect(isPrivateOrLocalhost('api.localhost')).toBe(true);
            expect(isPrivateOrLocalhost('LOCALHOST')).toBe(true);

            expect(isPrivateHost).not.toHaveBeenCalled();
        });

        it('Should delegate to isPrivateHost for non-localhost hostnames', () => {
            vi.mocked(isPrivateHost).mockReturnValueOnce(true).mockReturnValueOnce(false);

            expect(isPrivateOrLocalhost('10.0.0.1')).toBe(true);
            expect(isPrivateOrLocalhost('example.com')).toBe(false);

            expect(isPrivateHost).toHaveBeenCalledTimes(2);
            expect(isPrivateHost).toHaveBeenNthCalledWith(1, '10.0.0.1');
            expect(isPrivateHost).toHaveBeenNthCalledWith(2, 'example.com');
        });
    });
});

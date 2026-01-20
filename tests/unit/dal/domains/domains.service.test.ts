import { describe, beforeEach, afterEach, it, vi, expect, Mock } from 'vitest';
import { getRegistrableDomain } from '@/lib/utils';
import { extractRegistrationDate, fetchRdapJson, getRdapUrl, isRedactedRegistration } from '@/lib/rdap/rdap.endpoints';
import { getRdapInfo } from '@/dal/domains/domains.service';
import { RdapStatus } from '@/lib/rdap/rdap.types';

// Mock all dependencies
vi.mock('@/lib/utils', () => ({
    getRegistrableDomain: vi.fn(),
}));

vi.mock('@/lib/rdap/rdap.endpoints', () => ({
    getRdapUrl: vi.fn(),
    fetchRdapJson: vi.fn(),
    extractRegistrationDate: vi.fn(),
    isRedactedRegistration: vi.fn(),
}));

// Mock Date for consistent testing
const mockDate = new Date('2024-01-15T10:30:00Z');

describe('RDAP info retrieval tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(mockDate);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return UNSUPPORTED status when getRegistrableDomain returns null', async () => {
        (getRegistrableDomain as Mock).mockReturnValue(null);

        const result = await getRdapInfo('localhost');

        expect(result).toEqual({
            registeredAt: null,
            status: RdapStatus.UNSUPPORTED,
            source: 'RDAP',
            checkedAt: mockDate,
            rdapFetchedAt: undefined,
        });
        expect(getRegistrableDomain).toHaveBeenCalledWith('localhost');
        expect(getRdapUrl).not.toHaveBeenCalled();
        expect(fetchRdapJson).not.toHaveBeenCalled();
    });

    it('should return UNSUPPORTED status when getRdapUrl returns null', async () => {
        (getRegistrableDomain as Mock).mockReturnValue('example.com');
        (getRdapUrl as Mock).mockReturnValue(null);

        const result = await getRdapInfo('sub.example.com');

        expect(result).toEqual({
            registeredAt: null,
            status: RdapStatus.UNSUPPORTED,
            source: 'RDAP',
            checkedAt: mockDate,
            rdapFetchedAt: undefined,
        });
        expect(getRegistrableDomain).toHaveBeenCalledWith('sub.example.com');
        expect(getRdapUrl).toHaveBeenCalledWith('example.com');
        expect(fetchRdapJson).not.toHaveBeenCalled();
    });

    describe('when fetchRdapJson returns error', () => {
        beforeEach(() => {
            (getRegistrableDomain as Mock).mockReturnValue('example.com');
            (getRdapUrl as Mock).mockReturnValue('https://rdap.example.com/domain/example.com');
        });

        it('should return MISSING status for 404 error', async () => {
            (fetchRdapJson as Mock).mockResolvedValue({
                ok: false,
                status: 404,
            });

            const result = await getRdapInfo('example.com');

            expect(result).toEqual({
                registeredAt: null,
                status: RdapStatus.MISSING,
                source: 'RDAP',
                checkedAt: mockDate,
                rdapFetchedAt: mockDate,
            });

            expect(fetchRdapJson).toHaveBeenCalledWith('https://rdap.example.com/domain/example.com');
        });

        it('should return ERROR status for other error status codes', async () => {
            const errorStatuses = [400, 401, 403, 429, 500, 502, 503];

            for (const status of errorStatuses) {
                (fetchRdapJson as Mock).mockResolvedValue({
                    ok: false,
                    status,
                });

                const result = await getRdapInfo('example.com');

                expect(result).toEqual({
                    registeredAt: null,
                    status: RdapStatus.ERROR,
                    source: 'RDAP',
                    checkedAt: mockDate,
                    rdapFetchedAt: mockDate,
                });

                expect(fetchRdapJson).toHaveBeenCalledWith('https://rdap.example.com/domain/example.com');
            }
        });

        it('should return ERROR status for network/timeout error (status 0)', async () => {
            (fetchRdapJson as Mock).mockResolvedValue({
                ok: false,
                status: 0,
            });

            const result = await getRdapInfo('example.com');

            expect(result).toEqual({
                registeredAt: null,
                status: RdapStatus.ERROR,
                source: 'RDAP',
                checkedAt: mockDate,
                rdapFetchedAt: mockDate,
            });
        });
    });

    describe('when fetchRdapJson returns success', () => {
        const mockRdapJson = { events: [{ eventAction: 'registration' }] };

        beforeEach(() => {
            (getRegistrableDomain as Mock).mockReturnValue('example.com');
            (getRdapUrl as Mock).mockReturnValue('https://rdap.example.com/domain/example.com');
            (fetchRdapJson as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                json: mockRdapJson,
            });
        });

        it('should return OK status with registration date when extractRegistrationDate returns date', async () => {
            const registrationDate = new Date('2023-01-15T10:30:00Z');
            (extractRegistrationDate as Mock).mockReturnValue(registrationDate);

            const result = await getRdapInfo('example.com');

            expect(result).toEqual({
                registeredAt: registrationDate,
                status: RdapStatus.OK,
                source: 'RDAP',
                checkedAt: mockDate,
                rdapFetchedAt: mockDate,
                rdapRaw: mockRdapJson,
            });

            expect(extractRegistrationDate).toHaveBeenCalledWith(mockRdapJson);
            expect(isRedactedRegistration).not.toHaveBeenCalled();
        });


        it('should return REDACTED status when registration is redacted', async () => {
            (extractRegistrationDate as Mock).mockReturnValue(null);
            (isRedactedRegistration as Mock).mockReturnValue(true);

            const result = await getRdapInfo('example.com');

            expect(result).toEqual({
                registeredAt: null,
                status: RdapStatus.REDACTED,
                source: 'RDAP',
                checkedAt: mockDate,
                rdapFetchedAt: mockDate,
                rdapRaw: mockRdapJson,
            });
            expect(extractRegistrationDate).toHaveBeenCalledWith(mockRdapJson);
            expect(isRedactedRegistration).toHaveBeenCalledWith(mockRdapJson);
        });

        it('should return MISSING status when no registration info found and not redacted', async () => {
            (extractRegistrationDate as Mock).mockReturnValue(null);
            (isRedactedRegistration as Mock).mockReturnValue(false);

            const result = await getRdapInfo('example.com');

            expect(result).toEqual({
                registeredAt: null,
                status: RdapStatus.MISSING,
                source: 'RDAP',
                checkedAt: mockDate,
                rdapFetchedAt: mockDate,
                rdapRaw: mockRdapJson,
            });
            expect(extractRegistrationDate).toHaveBeenCalledWith(mockRdapJson);
            expect(isRedactedRegistration).toHaveBeenCalledWith(mockRdapJson);
        });

        it('should use different timeout if specified in getRdapUrl mock', async () => {
            // Arrange
            (getRegistrableDomain as Mock).mockReturnValue('example.com');
            (getRdapUrl as Mock).mockReturnValue('https://rdap.example.com/domain/example.com?timeout=5000');
            (fetchRdapJson as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                json: mockRdapJson,
            });
            (extractRegistrationDate as Mock).mockReturnValue(null);
            (isRedactedRegistration as Mock).mockReturnValue(false);

            await getRdapInfo('example.com');

            // Assert
            expect(fetchRdapJson).toHaveBeenCalledWith(
                'https://rdap.example.com/domain/example.com?timeout=5000',
            );
        });
    });

    describe('getRdapInfo workflow scenarios', () => {
        beforeEach(() => {
            (getRegistrableDomain as Mock).mockImplementation((hostname) => {
                const parts = hostname.split('.');
                if (parts.length >= 2) {
                    return parts.slice(-2).join('.');
                }
                return null;
            });
        });

        it('should complete full workflow for domain with registration date', async () => {
            // Arrange
            const host = 'sub.example.com';
            const domain = 'example.com';
            const mockUrl = 'https://rdap.mock.com/domain/example.com';
            const registrationDate = new Date('2022-05-20T08:15:00Z');
            const mockRdapJson = {
                events: [{ eventAction: 'registration', eventDate: '2022-05-20T08:15:00Z' }],
            };

            (getRdapUrl as Mock).mockReturnValue(mockUrl);
            (fetchRdapJson as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                json: mockRdapJson,
            });
            (extractRegistrationDate as Mock).mockReturnValue(registrationDate);
            (isRedactedRegistration as Mock).mockReturnValue(false);

            // Act
            const result = await getRdapInfo(host);

            // Assert
            expect(getRegistrableDomain).toHaveBeenCalledWith(host);
            expect(getRdapUrl).toHaveBeenCalledWith(domain);
            expect(fetchRdapJson).toHaveBeenCalledWith(mockUrl);

            expect(extractRegistrationDate).toHaveBeenCalledWith(mockRdapJson);
            expect(isRedactedRegistration).not.toHaveBeenCalled();

            expect(result).toEqual({
                registeredAt: registrationDate,
                status: RdapStatus.OK,
                source: 'RDAP',
                checkedAt: mockDate,
                rdapFetchedAt: mockDate,
                rdapRaw: mockRdapJson,
            });
        });

        it('should handle GDPR redacted registration scenario', async () => {
            // Arrange
            const mockRdapJson = {
                events: [{ eventAction: 'registration', eventDate: null }],
            };

            (getRdapUrl as Mock).mockReturnValue('https://rdap.mock.com/domain/gdpr-example.eu');
            (fetchRdapJson as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                json: mockRdapJson,
            });
            (extractRegistrationDate as Mock).mockReturnValue(null);
            (isRedactedRegistration as Mock).mockReturnValue(true);

            // Act
            const result = await getRdapInfo('gdpr-example.eu');

            // Assert
            expect(result.status).toBe(RdapStatus.REDACTED);
            expect(result.registeredAt).toBeNull();
            expect(result.rdapRaw).toEqual(mockRdapJson);
        });

        it('should handle non-existent domain (simulated 404)', async () => {
            // Arrange
            (getRdapUrl as Mock).mockReturnValue('https://rdap.mock.com/domain/nonexistent.com');
            (fetchRdapJson as Mock).mockResolvedValue({
                ok: false,
                status: 404,
            });

            // Act
            const result = await getRdapInfo('nonexistent.com');

            // Assert
            expect(result.status).toBe(RdapStatus.MISSING);
            expect(result.registeredAt).toBeNull();
            expect(result.rdapFetchedAt).toEqual(mockDate);
        });

        it('should handle RDAP server error scenario', async () => {
            // Arrange
            (getRdapUrl as Mock).mockReturnValue('https://rdap.mock.com/domain/example.com');
            (fetchRdapJson as Mock).mockResolvedValue({
                ok: false,
                status: 500,
            });

            // Act
            const result = await getRdapInfo('example.com');

            // Assert
            expect(result.status).toBe(RdapStatus.ERROR);
            expect(result.registeredAt).toBeNull();
            expect(result.rdapFetchedAt).toEqual(mockDate);
        });

        it('should handle network timeout scenario', async () => {
            // Arrange
            (getRdapUrl as Mock).mockReturnValue('https://rdap.slow-mock.com/domain/example.com');
            (fetchRdapJson as Mock).mockResolvedValue({
                ok: false,
                status: 0,
            });

            // Act
            const result = await getRdapInfo('example.com');

            // Assert
            expect(result.status).toBe(RdapStatus.ERROR);
            expect(result.registeredAt).toBeNull();
            expect(result.rdapFetchedAt).toEqual(mockDate);
        });
    });

    describe('getRdapInfo edge cases', () => {
        it('should handle IP addresses (no registrable domain)', async () => {
            (getRegistrableDomain as Mock).mockReturnValue(null);

            const result = await getRdapInfo('192.168.1.1');

            expect(result.status).toBe(RdapStatus.UNSUPPORTED);
            expect(getRdapUrl).not.toHaveBeenCalled();
        });

        it('should handle localhost (no registrable domain)', async () => {
            (getRegistrableDomain as Mock).mockReturnValue(null);

            const result = await getRdapInfo('localhost');

            expect(result.status).toBe(RdapStatus.UNSUPPORTED);
        });

        it('should handle unsupported TLDs', async () => {
            (getRegistrableDomain as Mock).mockReturnValue('example.gov');
            (getRdapUrl as Mock).mockReturnValue(null);

            const result = await getRdapInfo('example.gov');

            expect(result.status).toBe(RdapStatus.UNSUPPORTED);
        });

        it('should preserve complex RDAP JSON structure in response', async () => {
            // Arrange
            const complexRdapJson = {
                events: [{ eventAction: 'registration', eventDate: '2023-01-15T10:30:00Z' }],
                entities: [{ roles: ['registrant'], vcardArray: [] }],
                status: ['active'],
                links: [{ href: 'self', rel: 'self' }],
                notices: [{ title: 'Terms of Service' }],
                port43: 'whois.example.com',
                ldhName: 'EXAMPLE.COM',
            };

            (getRegistrableDomain as Mock).mockReturnValue('example.com');
            (getRdapUrl as Mock).mockReturnValue('https://rdap.mock.com/domain/example.com');
            (fetchRdapJson as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                json: complexRdapJson,
            });
            (extractRegistrationDate as Mock).mockReturnValue(new Date('2023-01-15T10:30:00Z'));
            (isRedactedRegistration as Mock).mockReturnValue(false);

            // Act
            const result = await getRdapInfo('example.com');

            // Assert
            expect(result.rdapRaw).toEqual(complexRdapJson);
            expect(result.rdapRaw).toHaveProperty('events');
            expect(result.rdapRaw).toHaveProperty('entities');
            expect(result.rdapRaw).toHaveProperty('status');
        });

        it('should handle subdomains correctly', async () => {
            // Arrange
            (getRegistrableDomain as Mock).mockReturnValue('example.com');
            (getRdapUrl as Mock).mockReturnValue('https://rdap.mock.com/domain/example.com');
            (fetchRdapJson as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                json: { events: [] },
            });
            (extractRegistrationDate as Mock).mockReturnValue(null);
            (isRedactedRegistration as Mock).mockReturnValue(false);

            // Act
            const result = await getRdapInfo('deep.nested.sub.example.com');

            // Assert
            expect(getRegistrableDomain).toHaveBeenCalledWith('deep.nested.sub.example.com');
            expect(getRdapUrl).toHaveBeenCalledWith('example.com');
            expect(result.status).toBe(RdapStatus.MISSING);
        });

        it('should use current time for checkedAt and rdapFetchedAt', async () => {
            // Arrange
            const testDate = new Date('2024-03-20T15:45:30Z');
            vi.setSystemTime(testDate);

            (getRegistrableDomain as Mock).mockReturnValue('example.com');
            (getRdapUrl as Mock).mockReturnValue('https://rdap.mock.com/domain/example.com');
            (fetchRdapJson as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                json: { events: [] },
            });
            (extractRegistrationDate as Mock).mockReturnValue(null);
            (isRedactedRegistration as Mock).mockReturnValue(false);

            // Act
            const result = await getRdapInfo('example.com');

            // Assert
            expect(result.checkedAt).toEqual(testDate);
            expect(result.rdapFetchedAt).toEqual(testDate);
        });
    });
});

import { describe, beforeEach, afterEach, it, vi, expect, Mock } from 'vitest';
import { getRegistrableDomain } from '@/lib/utils';
import { extractRegistrationDate, fetchRdapJson, getRdapUrl, isRedactedRdapRegistration } from '@/lib/rdap/rdap.endpoints';
import { getRdapInfo, getWhoisInfo } from '@/dal/domains/domains.service';
import { RdapStatus } from '@/lib/rdap/rdap.types';
import { extractWhoisRegistrationDate, fetchWhoisTextViaCli, isWhoisRedacted } from '@/lib/whois/whois.endpoints';
import { WhoisStatus } from '@/lib/whois/whois.types';

// Mock all dependencies
vi.mock('@/lib/utils', () => ({
    getRegistrableDomain: vi.fn(),
}));

vi.mock('@/lib/rdap/rdap.endpoints', () => ({
    getRdapUrl: vi.fn(),
    fetchRdapJson: vi.fn(),
    extractRegistrationDate: vi.fn(),
    isRedactedRdapRegistration: vi.fn(),
}));

// Mock the external dependencies used in getWhoisInfo
vi.mock('@/lib/whois/whois.endpoints', () => ({
    fetchWhoisTextViaCli: vi.fn(),
    extractWhoisRegistrationDate: vi.fn(),
    isWhoisRedacted: vi.fn(),
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
            expect(isRedactedRdapRegistration).not.toHaveBeenCalled();
        });


        it('should return REDACTED status when registration is redacted', async () => {
            (extractRegistrationDate as Mock).mockReturnValue(null);
            (isRedactedRdapRegistration as Mock).mockReturnValue(true);

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
            expect(isRedactedRdapRegistration).toHaveBeenCalledWith(mockRdapJson);
        });

        it('should return MISSING status when no registration info found and not redacted', async () => {
            (extractRegistrationDate as Mock).mockReturnValue(null);
            (isRedactedRdapRegistration as Mock).mockReturnValue(false);

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
            expect(isRedactedRdapRegistration).toHaveBeenCalledWith(mockRdapJson);
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
            (isRedactedRdapRegistration as Mock).mockReturnValue(false);

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
            (isRedactedRdapRegistration as Mock).mockReturnValue(false);

            // Act
            const result = await getRdapInfo(host);

            // Assert
            expect(getRegistrableDomain).toHaveBeenCalledWith(host);
            expect(getRdapUrl).toHaveBeenCalledWith(domain);
            expect(fetchRdapJson).toHaveBeenCalledWith(mockUrl);

            expect(extractRegistrationDate).toHaveBeenCalledWith(mockRdapJson);
            expect(isRedactedRdapRegistration).not.toHaveBeenCalled();

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
            (isRedactedRdapRegistration as Mock).mockReturnValue(true);

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
            (isRedactedRdapRegistration as Mock).mockReturnValue(false);

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
            (isRedactedRdapRegistration as Mock).mockReturnValue(false);

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
            (isRedactedRdapRegistration as Mock).mockReturnValue(false);

            // Act
            const result = await getRdapInfo('example.com');

            // Assert
            expect(result.checkedAt).toEqual(testDate);
            expect(result.rdapFetchedAt).toEqual(testDate);
        });
    });
});

describe('WHOIS info retrieval tests', () => {
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

        const result = await getWhoisInfo('localhost');

        expect(result).toEqual({
            registeredAt: null,
            status: WhoisStatus.UNSUPPORTED,
            source: 'WHOIS',
            checkedAt: mockDate,
            whoisFetchedAt: undefined,
        });
        expect(getRegistrableDomain).toHaveBeenCalledWith('localhost');
        expect(fetchWhoisTextViaCli).not.toHaveBeenCalled();
    });

    describe('when fetchWhoisTextViaCli returns error', () => {
        beforeEach(() => {
            (getRegistrableDomain as Mock).mockReturnValue('example.com');
        });

        it('should return MISSING status for 404 error', async () => {
            (fetchWhoisTextViaCli as Mock).mockResolvedValue({
                ok: false,
                status: 404,
                text: '',
            });

            const result = await getWhoisInfo('example.com');

            expect(result).toEqual({
                registeredAt: null,
                status: WhoisStatus.MISSING,
                source: 'WHOIS',
                checkedAt: mockDate,
                whoisFetchedAt: mockDate,
            });

            expect(fetchWhoisTextViaCli).toHaveBeenCalledWith('example.com');
        });

        it('should return ERROR status for other error status codes', async () => {
            const errorStatuses = [400, 401, 403, 429, 500, 502, 503];

            for (const status of errorStatuses) {
                (fetchWhoisTextViaCli as Mock).mockResolvedValue({
                    ok: false,
                    status,
                    text: '',
                });

                const result = await getWhoisInfo('example.com');

                expect(result).toEqual({
                    registeredAt: null,
                    status: WhoisStatus.ERROR,
                    source: 'WHOIS',
                    checkedAt: mockDate,
                    whoisFetchedAt: mockDate,
                });

                expect(fetchWhoisTextViaCli).toHaveBeenCalledWith('example.com');
            }
        });

        it('should return ERROR status for network/timeout error (status 0)', async () => {
            (fetchWhoisTextViaCli as Mock).mockResolvedValue({
                ok: false,
                status: 0,
                text: '',
            });

            const result = await getWhoisInfo('example.com');

            expect(result).toEqual({
                registeredAt: null,
                status: WhoisStatus.ERROR,
                source: 'WHOIS',
                checkedAt: mockDate,
                whoisFetchedAt: mockDate,
            });
        });
    });

    describe('when fetchWhoisTextViaCli returns success', () => {
        const mockWhoisText = 'Domain Name: EXAMPLE.COM\nCreation Date: 2023-01-15T10:30:00Z';

        beforeEach(() => {
            (getRegistrableDomain as Mock).mockReturnValue('example.com');
            (fetchWhoisTextViaCli as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                text: mockWhoisText,
            });
        });

        it('should return OK status with registration date when extractWhoisRegistrationDate returns date', async () => {
            const registrationDate = new Date('2023-01-15T10:30:00Z');
            (extractWhoisRegistrationDate as Mock).mockReturnValue(registrationDate);
            (isWhoisRedacted as Mock).mockReturnValue(false);

            const result = await getWhoisInfo('example.com');

            expect(result).toEqual({
                registeredAt: registrationDate,
                status: WhoisStatus.OK,
                source: 'WHOIS',
                checkedAt: mockDate,
                whoisFetchedAt: mockDate,
                whoisRaw: mockWhoisText,
            });

            expect(extractWhoisRegistrationDate).toHaveBeenCalledWith(mockWhoisText);
            expect(isWhoisRedacted).not.toHaveBeenCalled();
        });

        it('should return REDACTED status when WHOIS is redacted', async () => {
            (extractWhoisRegistrationDate as Mock).mockReturnValue(null);
            (isWhoisRedacted as Mock).mockReturnValue(true);

            const result = await getWhoisInfo('example.com');

            expect(result).toEqual({
                registeredAt: null,
                status: WhoisStatus.REDACTED,
                source: 'WHOIS',
                checkedAt: mockDate,
                whoisFetchedAt: mockDate,
                whoisRaw: mockWhoisText,
            });
            expect(extractWhoisRegistrationDate).toHaveBeenCalledWith(mockWhoisText);
            expect(isWhoisRedacted).toHaveBeenCalledWith(mockWhoisText);
        });

        it('should return MISSING status when no registration info found and not redacted', async () => {
            (extractWhoisRegistrationDate as Mock).mockReturnValue(null);
            (isWhoisRedacted as Mock).mockReturnValue(false);

            const result = await getWhoisInfo('example.com');

            expect(result).toEqual({
                registeredAt: null,
                status: WhoisStatus.MISSING,
                source: 'WHOIS',
                checkedAt: mockDate,
                whoisFetchedAt: mockDate,
                whoisRaw: mockWhoisText,
            });
            expect(extractWhoisRegistrationDate).toHaveBeenCalledWith(mockWhoisText);
            expect(isWhoisRedacted).toHaveBeenCalledWith(mockWhoisText);
        });
    });

    describe('getWhoisInfo workflow scenarios', () => {
        beforeEach(() => {
            (getRegistrableDomain as Mock).mockImplementation((hostname) => {
                // Simulate basic domain extraction
                const parts = hostname.split('.');
                if (parts.length >= 2 && parts[parts.length - 1] !== 'localhost') {
                    return parts.slice(-2).join('.');
                }
                return null;
            });
        });

        it('should complete full workflow for domain with registration date', async () => {
            // Arrange
            const host = 'sub.example.com';
            const domain = 'example.com';
            const whoisText = 'Domain name: example.com\nCreation Date: 2022-05-20T08:15:00Z\n';
            const registrationDate = new Date('2022-05-20T08:15:00Z');

            (fetchWhoisTextViaCli as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                text: whoisText,
            });
            (extractWhoisRegistrationDate as Mock).mockReturnValue(registrationDate);
            (isWhoisRedacted as Mock).mockReturnValue(false);

            // Act
            const result = await getWhoisInfo(host);

            // Assert
            expect(getRegistrableDomain).toHaveBeenCalledWith(host);
            expect(fetchWhoisTextViaCli).toHaveBeenCalledWith(domain);

            expect(extractWhoisRegistrationDate).toHaveBeenCalledWith(whoisText);
            expect(isWhoisRedacted).not.toHaveBeenCalled();

            expect(result).toEqual({
                registeredAt: registrationDate,
                status: WhoisStatus.OK,
                source: 'WHOIS',
                checkedAt: mockDate,
                whoisFetchedAt: mockDate,
                whoisRaw: whoisText,
            });
        });

        it('should handle GDPR redacted WHOIS scenario', async () => {
            // Arrange
            const whoisText = 'Domain name: gdpr-example.eu\nData protected by GDPR\n';

            (fetchWhoisTextViaCli as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                text: whoisText,
            });
            (extractWhoisRegistrationDate as Mock).mockReturnValue(null);
            (isWhoisRedacted as Mock).mockReturnValue(true);

            // Act
            const result = await getWhoisInfo('gdpr-example.eu');

            // Assert
            expect(result.status).toBe(WhoisStatus.REDACTED);
            expect(result.registeredAt).toBeNull();
            expect(result.whoisRaw).toEqual(whoisText);
        });

        it('should handle non-existent domain (simulated 404)', async () => {
            // Arrange
            (fetchWhoisTextViaCli as Mock).mockResolvedValue({
                ok: false,
                status: 404,
                text: 'Domain not found',
            });

            // Act
            const result = await getWhoisInfo('nonexistent.com');

            // Assert
            expect(result.status).toBe(WhoisStatus.MISSING);
            expect(result.registeredAt).toBeNull();
            expect(result.whoisFetchedAt).toEqual(mockDate);
        });

        it('should handle WHOIS server error scenario', async () => {
            // Arrange
            (fetchWhoisTextViaCli as Mock).mockResolvedValue({
                ok: false,
                status: 500,
                text: 'Server error',
            });

            // Act
            const result = await getWhoisInfo('example.com');

            // Assert
            expect(result.status).toBe(WhoisStatus.ERROR);
            expect(result.registeredAt).toBeNull();
            expect(result.whoisFetchedAt).toEqual(mockDate);
        });

        it('should handle network timeout scenario', async () => {
            // Arrange
            (fetchWhoisTextViaCli as Mock).mockResolvedValue({
                ok: false,
                status: 0,
                text: 'Connection timeout',
            });

            // Act
            const result = await getWhoisInfo('example.com');

            // Assert
            expect(result.status).toBe(WhoisStatus.ERROR);
            expect(result.registeredAt).toBeNull();
            expect(result.whoisFetchedAt).toEqual(mockDate);
        });
    });

    describe('getWhoisInfo edge cases', () => {
        it('should handle IP addresses (no registrable domain)', async () => {
            (getRegistrableDomain as Mock).mockReturnValue(null);

            const result = await getWhoisInfo('192.168.1.1');

            expect(result.status).toBe(WhoisStatus.UNSUPPORTED);
            expect(fetchWhoisTextViaCli).not.toHaveBeenCalled();
        });

        it('should handle localhost (no registrable domain)', async () => {
            (getRegistrableDomain as Mock).mockReturnValue(null);

            const result = await getWhoisInfo('localhost');

            expect(result.status).toBe(WhoisStatus.UNSUPPORTED);
        });

        it('should preserve WHOIS raw text in response', async () => {
            // Arrange
            const longWhoisText = `Domain Name: EXAMPLE.COM
Registry Domain ID: 1234567_DOMAIN_COM-VRSN
Registrar WHOIS Server: whois.example-registrar.com
Registrar URL: http://www.example-registrar.com
Updated Date: 2023-12-01T00:00:00Z
Creation Date: 2023-01-15T10:30:00Z
Registry Expiry Date: 2024-01-15T10:30:00Z
Registrar: Example Registrar Inc.
Registrar IANA ID: 1234
Registrar Abuse Contact Email: abuse@example-registrar.com
Registrar Abuse Contact Phone: +1.1234567890
Domain Status: ok https://icann.org/epp#ok
Name Server: NS1.EXAMPLE.COM
Name Server: NS2.EXAMPLE.COM
DNSSEC: unsigned
URL of the ICANN Whois Inaccuracy Complaint Form: https://www.icann.org/wicf/
>>> Last update of whois database: 2024-01-15T10:00:00Z <<<`;

            (getRegistrableDomain as Mock).mockReturnValue('example.com');
            (fetchWhoisTextViaCli as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                text: longWhoisText,
            });
            (extractWhoisRegistrationDate as Mock).mockReturnValue(new Date('2023-01-15T10:30:00Z'));
            (isWhoisRedacted as Mock).mockReturnValue(false);

            // Act
            const result = await getWhoisInfo('example.com');

            // Assert
            expect(result.whoisRaw).toEqual(longWhoisText);
            expect(result.whoisRaw).toContain('Domain Name: EXAMPLE.COM');
            expect(result.whoisRaw).toContain('Creation Date: 2023-01-15T10:30:00Z');
        });

        it('should handle subdomains correctly', async () => {
            // Arrange
            (getRegistrableDomain as Mock).mockReturnValue('example.com');
            (fetchWhoisTextViaCli as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                text: 'Domain: example.com\nNo creation date found',
            });
            (extractWhoisRegistrationDate as Mock).mockReturnValue(null);
            (isWhoisRedacted as Mock).mockReturnValue(false);

            // Act
            const result = await getWhoisInfo('deep.nested.sub.example.com');

            // Assert
            expect(getRegistrableDomain).toHaveBeenCalledWith('deep.nested.sub.example.com');
            expect(fetchWhoisTextViaCli).toHaveBeenCalledWith('example.com');
            expect(result.status).toBe(WhoisStatus.MISSING);
        });

        it('should use current time for checkedAt and whoisFetchedAt', async () => {
            // Arrange
            const testDate = new Date('2024-03-20T15:45:30Z');
            vi.setSystemTime(testDate);

            (getRegistrableDomain as Mock).mockReturnValue('example.com');
            (fetchWhoisTextViaCli as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                text: 'Domain: example.com\nCreation Date: 2023-01-15T10:30:00Z',
            });
            (extractWhoisRegistrationDate as Mock).mockReturnValue(new Date('2023-01-15T10:30:00Z'));
            (isWhoisRedacted as Mock).mockReturnValue(false);

            // Act
            const result = await getWhoisInfo('example.com');

            // Assert
            expect(result.checkedAt).toEqual(testDate);
            expect(result.whoisFetchedAt).toEqual(testDate);
        });

        it('should handle partial WHOIS responses', async () => {
            // Arrange
            const partialWhoisText = 'Domain: example.com\nStatus: active\n';

            (getRegistrableDomain as Mock).mockReturnValue('example.com');
            (fetchWhoisTextViaCli as Mock).mockResolvedValue({
                ok: true,
                status: 200,
                text: partialWhoisText,
            });
            (extractWhoisRegistrationDate as Mock).mockReturnValue(null);
            (isWhoisRedacted as Mock).mockReturnValue(false);

            // Act
            const result = await getWhoisInfo('example.com');

            // Assert
            expect(result.status).toBe(WhoisStatus.MISSING);
            expect(result.whoisRaw).toBe(partialWhoisText);
        });
    });
});

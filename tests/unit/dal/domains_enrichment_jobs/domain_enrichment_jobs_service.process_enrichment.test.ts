import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RdapStatus } from '@/lib/rdap/rdap.types';

// Mock dependencies
vi.mock('@/dal/domains/domains.service', () => ({
    getRdapInfo: vi.fn(),
    getWhoisInfo: vi.fn(),
    pickBestKnown: vi.fn(),
}));

vi.mock('@/dal/domains/domains.repo', () => ({
    updateDomainBestKnown: vi.fn(),
    updateDomainRdapCache: vi.fn(),
    updateDomainWhoisCache: vi.fn(),
}));

// Import mocked functions after mocking
import { getRdapInfo, getWhoisInfo, pickBestKnown } from '@/dal/domains/domains.service';

import { updateDomainBestKnown, updateDomainRdapCache, updateDomainWhoisCache } from '@/dal/domains/domains.repo';
import { processDomainEnrichment } from '@/dal/domain_enrichment_jobs/domain_enrichment_jobs.service';
import { DomainSource, DomainStatus } from '@/generated/prisma/enums';
import { WhoisStatus } from '@/lib/whois/whois.types';
import { UpdateDomainBestKnownInput, UpdateDomainRdapCacheInput } from '@/dal/domains/domains.types';

const mockGetRdapInfo = vi.mocked(getRdapInfo);
const mockGetWhoisInfo = vi.mocked(getWhoisInfo);
const mockPickBestKnown = vi.mocked(pickBestKnown);
const mockUpdateDomainRdapCache = vi.mocked(updateDomainRdapCache);
const mockUpdateDomainWhoisCache = vi.mocked(updateDomainWhoisCache);
const mockUpdateDomainBestKnown = vi.mocked(updateDomainBestKnown);

describe('processDomainEnrichment', () => {
    const mockDomainId = 'test-domain-id';
    const mockHostname = 'example.com';
    const mockNow = new Date('2024-01-01T00:00:00.000Z');

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(mockNow);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('RDAP success scenarios', () => {
        it('should process domain with successful RDAP response and registered date', async () => {
            // Arrange
            const mockRdapResponse = {
                registeredAt: new Date('2020-01-01'),
                status: RdapStatus.OK,
                rdapRaw: { some: 'data' },
                rdapFetchedAt: mockNow,
                checkedAt: mockNow,
                source: 'RDAP' as const,
            };

            const mockBestKnown = {
                registeredAt: new Date('2020-01-01'),
                checkedAt: mockNow,
                source: DomainSource.RDAP,
                status: DomainStatus.OK,
            };

            mockGetRdapInfo.mockResolvedValue(mockRdapResponse);
            mockPickBestKnown.mockReturnValue(mockBestKnown);

            // Act
            await processDomainEnrichment(mockHostname, mockDomainId);

            // Assert
            expect(mockGetRdapInfo).toHaveBeenCalledWith(mockHostname);
            expect(mockUpdateDomainRdapCache).toHaveBeenCalledWith({
                domainId: mockDomainId,
                rdapFetchedAt: mockNow,
                rdapRaw: { some: 'data' },
                status: DomainStatus.OK,
            });
            expect(mockGetWhoisInfo).not.toHaveBeenCalled();
            expect(mockUpdateDomainWhoisCache).not.toHaveBeenCalled();
            expect(mockPickBestKnown).toHaveBeenCalledWith(mockRdapResponse, null);
            expect(mockUpdateDomainBestKnown).toHaveBeenCalledWith({
                domainId: mockDomainId,
                ...mockBestKnown,
            });
        });

        it('should process domain with successful RDAP response but no registered date', async () => {
            // Arrange
            const mockRdapResponse = {
                registeredAt: null,
                status: RdapStatus.REDACTED,
                rdapRaw: { redacted: true },
                rdapFetchedAt: mockNow,
                checkedAt: mockNow,
                source: 'RDAP' as const,
            };

            const mockBestKnown = {
                registeredAt: null,
                checkedAt: mockNow,
                source: DomainSource.RDAP,
                status: DomainStatus.REDACTED,
            };

            mockGetRdapInfo.mockResolvedValue(mockRdapResponse);
            mockPickBestKnown.mockReturnValue(mockBestKnown);

            // Act
            await processDomainEnrichment(mockHostname, mockDomainId);

            // Assert
            expect(mockGetRdapInfo).toHaveBeenCalledWith(mockHostname);
            expect(mockUpdateDomainRdapCache).toHaveBeenCalledWith({
                domainId: mockDomainId,
                rdapFetchedAt: mockNow,
                rdapRaw: { redacted: true },
                status: DomainStatus.REDACTED,
            });
            expect(mockGetWhoisInfo).not.toHaveBeenCalled();
            expect(mockUpdateDomainWhoisCache).not.toHaveBeenCalled();
            expect(mockPickBestKnown).toHaveBeenCalledWith(mockRdapResponse, null);
            expect(mockUpdateDomainBestKnown).toHaveBeenCalledWith({
                domainId: mockDomainId,
                ...mockBestKnown,
            });
        });
    });

    describe('RDAP fallback to WHOIS scenarios', () => {
        it('should fallback to WHOIS when RDAP is UNSUPPORTED', async () => {
            // Arrange
            const mockRdapResponse = {
                registeredAt: null,
                status: RdapStatus.UNSUPPORTED,
                checkedAt: mockNow,
                source: 'RDAP' as const,
            };

            const mockWhoisResponse = {
                registeredAt: new Date('2019-01-01'),
                status: WhoisStatus.OK, // Folosește WhoisStatus.OK în loc de string
                whoisRaw: 'Domain registered on 2019-01-01',
                whoisFetchedAt: mockNow,
                checkedAt: mockNow,
                source: 'WHOIS' as const,
            };

            const mockBestKnown = {
                registeredAt: new Date('2019-01-01'),
                checkedAt: mockNow,
                source: DomainSource.WHOIS,
                status: DomainStatus.OK,
            };

            mockGetRdapInfo.mockResolvedValue(mockRdapResponse);
            mockGetWhoisInfo.mockResolvedValue(mockWhoisResponse);
            mockPickBestKnown.mockReturnValue(mockBestKnown);

            // Act
            await processDomainEnrichment(mockHostname, mockDomainId);

            // Assert
            expect(mockGetRdapInfo).toHaveBeenCalledWith(mockHostname);
            expect(mockUpdateDomainRdapCache).toHaveBeenCalledWith({
                domainId: mockDomainId,
                rdapFetchedAt: undefined,
                rdapRaw: undefined,
                status: DomainStatus.UNSUPPORTED,
            });
            expect(mockGetWhoisInfo).toHaveBeenCalledWith(mockHostname);
            expect(mockUpdateDomainWhoisCache).toHaveBeenCalledWith({
                domainId: mockDomainId,
                whoisFetchedAt: mockNow,
                whoisRaw: 'Domain registered on 2019-01-01',
                status: DomainStatus.OK,
            });
            expect(mockPickBestKnown).toHaveBeenCalledWith(mockRdapResponse, mockWhoisResponse);
            expect(mockUpdateDomainBestKnown).toHaveBeenCalledWith({
                domainId: mockDomainId,
                ...mockBestKnown,
            });
        });

        it('should fallback to WHOIS when RDAP returns ERROR', async () => {
            // Arrange
            const mockRdapResponse = {
                registeredAt: null,
                status: RdapStatus.ERROR,
                checkedAt: mockNow,
                source: 'RDAP' as const,
            };

            const mockWhoisResponse = {
                registeredAt: null,
                status: WhoisStatus.REDACTED, // Folosește WhoisStatus.REDACTED
                whoisRaw: 'Redacted whois data',
                whoisFetchedAt: mockNow,
                checkedAt: mockNow,
                source: 'WHOIS' as const,
            };

            const mockBestKnown = {
                registeredAt: null,
                checkedAt: mockNow,
                source: DomainSource.WHOIS,
                status: DomainStatus.REDACTED,
            };

            mockGetRdapInfo.mockResolvedValue(mockRdapResponse);
            mockGetWhoisInfo.mockResolvedValue(mockWhoisResponse);
            mockPickBestKnown.mockReturnValue(mockBestKnown);

            // Act
            await processDomainEnrichment(mockHostname, mockDomainId);

            // Assert
            expect(mockGetRdapInfo).toHaveBeenCalledWith(mockHostname);
            expect(mockGetWhoisInfo).toHaveBeenCalledWith(mockHostname);
            expect(mockUpdateDomainWhoisCache).toHaveBeenCalled();
            expect(mockPickBestKnown).toHaveBeenCalledWith(mockRdapResponse, mockWhoisResponse);
            expect(mockUpdateDomainBestKnown).toHaveBeenCalled();
        });

        it('should fallback to WHOIS when RDAP returns MISSING', async () => {
            // Arrange
            const mockRdapResponse = {
                registeredAt: null,
                status: RdapStatus.MISSING,
                rdapFetchedAt: mockNow,
                checkedAt: mockNow,
                source: 'RDAP' as const,
            };

            const mockWhoisResponse = {
                registeredAt: null,
                status: WhoisStatus.MISSING, // Folosește WhoisStatus.MISSING
                whoisRaw: 'Domain not found',
                whoisFetchedAt: mockNow,
                checkedAt: mockNow,
                source: 'WHOIS' as const,
            };

            const mockBestKnown = {
                registeredAt: null,
                checkedAt: mockNow,
                source: DomainSource.WHOIS,
                status: DomainStatus.MISSING,
            };

            mockGetRdapInfo.mockResolvedValue(mockRdapResponse);
            mockGetWhoisInfo.mockResolvedValue(mockWhoisResponse);
            mockPickBestKnown.mockReturnValue(mockBestKnown);

            // Act
            await processDomainEnrichment(mockHostname, mockDomainId);

            // Assert
            expect(mockGetRdapInfo).toHaveBeenCalledWith(mockHostname);
            expect(mockGetWhoisInfo).toHaveBeenCalledWith(mockHostname);
            expect(mockUpdateDomainWhoisCache).toHaveBeenCalled();
            expect(mockPickBestKnown).toHaveBeenCalledWith(mockRdapResponse, mockWhoisResponse);
            expect(mockUpdateDomainBestKnown).toHaveBeenCalled();
        });

        it('should NOT fallback to WHOIS when RDAP is OK but has no registered date', async () => {
            // Notă: Acest scenariu NU ar trebui să declanșeze fallback bazat pe logica curentă
            // Statusul RDAP OK nu declanșează fallback chiar și fără dată de înregistrare
            // Arrange
            const mockRdapResponse = {
                registeredAt: null,
                status: RdapStatus.OK, // OK status chiar și fără dată
                rdapFetchedAt: mockNow,
                checkedAt: mockNow,
                source: 'RDAP' as const,
            };

            const mockBestKnown = {
                registeredAt: null,
                checkedAt: mockNow,
                source: DomainSource.RDAP,
                status: DomainStatus.OK,
            };

            mockGetRdapInfo.mockResolvedValue(mockRdapResponse);
            mockPickBestKnown.mockReturnValue(mockBestKnown);

            // Act
            await processDomainEnrichment(mockHostname, mockDomainId);

            // Assert
            expect(mockGetRdapInfo).toHaveBeenCalledWith(mockHostname);
            expect(mockGetWhoisInfo).not.toHaveBeenCalled();
            expect(mockUpdateDomainRdapCache).toHaveBeenCalled();
            expect(mockPickBestKnown).toHaveBeenCalledWith(mockRdapResponse, null);
            expect(mockUpdateDomainBestKnown).toHaveBeenCalled();
        });
    });

    describe('Edge cases and error handling', () => {
        it('should handle RDAP success without fallback even when WHOIS would be better', async () => {
            // RDAP este reușit (status OK), deci nu există fallback chiar dacă WHOIS ar avea date mai bune
            // Arrange
            const mockRdapResponse = {
                registeredAt: new Date('2021-01-01'),
                status: RdapStatus.OK,
                rdapRaw: { data: 'rdap' },
                rdapFetchedAt: mockNow,
                checkedAt: mockNow,
                source: 'RDAP' as const,
            };

            const mockBestKnown = {
                registeredAt: new Date('2021-01-01'),
                checkedAt: mockNow,
                source: DomainSource.RDAP,
                status: DomainStatus.OK,
            };

            mockGetRdapInfo.mockResolvedValue(mockRdapResponse);
            mockPickBestKnown.mockReturnValue(mockBestKnown);

            // Act
            await processDomainEnrichment(mockHostname, mockDomainId);

            // Assert
            expect(mockGetWhoisInfo).not.toHaveBeenCalled();
            expect(mockUpdateDomainWhoisCache).not.toHaveBeenCalled();
        });

        it('should propagate errors from getWhoisInfo during fallback', async () => {
            // Arrange
            const mockRdapResponse = {
                registeredAt: null,
                status: RdapStatus.ERROR,
                checkedAt: mockNow,
                source: 'RDAP' as const,
            };

            const error = new Error('WHOIS fetch failed');

            mockGetRdapInfo.mockResolvedValue(mockRdapResponse);
            mockGetWhoisInfo.mockRejectedValue(error);

            // Act & Assert
            await expect(processDomainEnrichment(mockHostname, mockDomainId)).rejects.toThrow('WHOIS fetch failed');

            expect(mockGetRdapInfo).toHaveBeenCalled();
            expect(mockUpdateDomainRdapCache).toHaveBeenCalled();
            expect(mockGetWhoisInfo).toHaveBeenCalled();
        });

        it('should handle different domain statuses correctly', async () => {
            const statuses = [
                RdapStatus.UNSUPPORTED,
                RdapStatus.ERROR,
                RdapStatus.MISSING,
                RdapStatus.OK,
                RdapStatus.REDACTED,
            ];

            for (const status of statuses) {
                // Resetează mock-urile pentru fiecare iterație
                vi.clearAllMocks();

                // Arrange
                const mockRdapResponse = {
                    registeredAt: status === RdapStatus.OK ? new Date('2020-01-01') : null,
                    status,
                    rdapRaw: { data: 'test' },
                    rdapFetchedAt: mockNow,
                    checkedAt: mockNow,
                    source: 'RDAP' as const,
                };

                const shouldFallback =
                    status === RdapStatus.UNSUPPORTED || status === RdapStatus.ERROR || status === RdapStatus.MISSING;

                mockGetRdapInfo.mockResolvedValue(mockRdapResponse);

                if (shouldFallback) {
                    const mockWhoisResponse = {
                        registeredAt: new Date('2019-01-01'),
                        status: WhoisStatus.OK, // Folosește WhoisStatus
                        whoisRaw: 'whois data',
                        whoisFetchedAt: mockNow,
                        checkedAt: mockNow,
                        source: 'WHOIS' as const,
                    };
                    mockGetWhoisInfo.mockResolvedValue(mockWhoisResponse);
                }

                const mockBestKnown = {
                    registeredAt: new Date('2020-01-01'),
                    checkedAt: mockNow,
                    source: DomainSource.RDAP,
                    status: DomainStatus.OK,
                };
                mockPickBestKnown.mockReturnValue(mockBestKnown);

                // Act
                await processDomainEnrichment(mockHostname, mockDomainId);

                // Assert
                expect(mockGetRdapInfo).toHaveBeenCalledWith(mockHostname);

                if (shouldFallback) {
                    expect(mockGetWhoisInfo).toHaveBeenCalledWith(mockHostname);
                } else {
                    expect(mockGetWhoisInfo).not.toHaveBeenCalled();
                }
            }
        });
    });

    describe('Integration behavior', () => {
        it('should execute all steps in correct order', async () => {
            // Arrange
            const mockRdapResponse = {
                registeredAt: new Date('2020-01-01'),
                status: RdapStatus.OK,
                rdapRaw: { data: 'rdap' },
                rdapFetchedAt: mockNow,
                checkedAt: mockNow,
                source: 'RDAP' as const,
            };

            const mockBestKnown = {
                registeredAt: new Date('2020-01-01'),
                checkedAt: mockNow,
                source: DomainSource.RDAP,
                status: DomainStatus.OK,
            };

            mockGetRdapInfo.mockResolvedValue(mockRdapResponse);
            mockPickBestKnown.mockReturnValue(mockBestKnown);

            const updateRdapCacheCalls: UpdateDomainRdapCacheInput[] = [];
            const updateBestKnownCalls: UpdateDomainBestKnownInput[] = [];

            mockUpdateDomainRdapCache.mockImplementation((input) => {
                updateRdapCacheCalls.push(input);
                return Promise.resolve();
            });

            mockUpdateDomainBestKnown.mockImplementation((input) => {
                updateBestKnownCalls.push(input);
                return Promise.resolve();
            });

            // Act
            await processDomainEnrichment(mockHostname, mockDomainId);

            // Assert
            expect(mockGetRdapInfo).toHaveBeenCalledBefore(mockUpdateDomainRdapCache);
            expect(mockUpdateDomainRdapCache).toHaveBeenCalledBefore(mockPickBestKnown);
            expect(mockPickBestKnown).toHaveBeenCalledBefore(mockUpdateDomainBestKnown);
        });

        it('should execute all steps in correct order with fallback', async () => {
            // Arrange
            const mockRdapResponse = {
                registeredAt: null,
                status: RdapStatus.ERROR,
                checkedAt: mockNow,
                source: 'RDAP' as const,
            };

            const mockWhoisResponse = {
                registeredAt: new Date('2019-01-01'),
                status: WhoisStatus.OK,
                whoisRaw: 'whois data',
                whoisFetchedAt: mockNow,
                checkedAt: mockNow,
                source: 'WHOIS' as const,
            };

            const mockBestKnown = {
                registeredAt: new Date('2019-01-01'),
                checkedAt: mockNow,
                source: DomainSource.WHOIS,
                status: DomainStatus.OK,
            };

            mockGetRdapInfo.mockResolvedValue(mockRdapResponse);
            mockGetWhoisInfo.mockResolvedValue(mockWhoisResponse);
            mockPickBestKnown.mockReturnValue(mockBestKnown);

            const executionOrder: string[] = [];

            mockGetRdapInfo.mockImplementation(async () => {
                executionOrder.push('getRdapInfo');
                return mockRdapResponse;
            });

            mockUpdateDomainRdapCache.mockImplementation(async () => {
                executionOrder.push('updateDomainRdapCache');
                return Promise.resolve();
            });

            mockGetWhoisInfo.mockImplementation(async () => {
                executionOrder.push('getWhoisInfo');
                return mockWhoisResponse;
            });

            mockUpdateDomainWhoisCache.mockImplementation(async () => {
                executionOrder.push('updateDomainWhoisCache');
                return Promise.resolve();
            });

            mockPickBestKnown.mockImplementation(() => {
                executionOrder.push('pickBestKnown');
                return mockBestKnown;
            });

            mockUpdateDomainBestKnown.mockImplementation(async () => {
                executionOrder.push('updateDomainBestKnown');
                return Promise.resolve();
            });

            // Act
            await processDomainEnrichment(mockHostname, mockDomainId);

            // Assert
            expect(executionOrder).toEqual([
                'getRdapInfo',
                'updateDomainRdapCache',
                'getWhoisInfo',
                'updateDomainWhoisCache',
                'pickBestKnown',
                'updateDomainBestKnown',
            ]);
        });
    });
});

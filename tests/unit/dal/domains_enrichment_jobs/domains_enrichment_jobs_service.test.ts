import { describe, it, beforeEach, afterEach, expect, vi, Mock } from 'vitest';
import { DomainSource, DomainStatus } from '@/generated/prisma/enums';
import { RdapDomainParams, RdapStatus } from '@/lib/rdap/rdap.types';
import { WhoisDomainParams, WhoisStatus } from '@/lib/whois/whois.types';
import { pickBestKnown } from '@/dal/domains/domains.service';
import { mapStatusToDomainStatus } from '@/dal/domains/domains.mapper';
import { getStatusPriority } from '@/lib/domain_enrichment_job/priority';

// Mock the dependencies
vi.mock('@/lib/domain_enrichment_job/priority', () => ({
    getStatusPriority: vi.fn(),
}));

vi.mock('@/dal/domains/domains.mapper', () => ({
    mapStatusToDomainStatus: vi.fn(),
}));

describe('pickBestKnown', () => {
    const mockDate = new Date('2024-01-15T10:30:00Z');
    const mockRegisteredDate = new Date('2023-01-01T00:00:00Z');

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(mockDate);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('RDAP has registration date', () => {
        it('should prefer RDAP when RDAP has registeredAt date', () => {
            // Arrange
            const rdap = {
                registeredAt: mockRegisteredDate,
                status: RdapStatus.OK,
                checkedAt: mockDate,
                source: 'RDAP' as const,
            };

            const whois = {
                registeredAt: mockRegisteredDate,
                status: WhoisStatus.OK,
                checkedAt: new Date('2024-01-15T09:30:00Z'), // Earlier check
            };

            (mapStatusToDomainStatus as Mock).mockReturnValue(DomainStatus.OK);

            // Act
            const result = pickBestKnown(rdap, whois);

            // Assert
            expect(result).toEqual({
                registeredAt: mockRegisteredDate,
                checkedAt: mockDate,
                source: DomainSource.RDAP,
                status: DomainStatus.OK,
            });
            expect(mapStatusToDomainStatus).toHaveBeenCalledWith(RdapStatus.OK);
        });

        it('should use RDAP even if WHOIS has later checkedAt', () => {
            // Arrange
            const laterDate = new Date('2024-01-15T11:30:00Z');
            const rdap = {
                registeredAt: mockRegisteredDate,
                status: RdapStatus.OK,
                checkedAt: mockDate,
            };

            const whois = {
                registeredAt: mockRegisteredDate,
                status: WhoisStatus.OK,
                checkedAt: laterDate, // Later check
            };

            (mapStatusToDomainStatus as Mock).mockReturnValue(DomainStatus.OK);

            // Act
            const result = pickBestKnown(rdap, whois);

            // Assert
            expect(result.source).toBe(DomainSource.RDAP);
            expect(result.checkedAt).toBe(mockDate); // Still uses RDAP's checkedAt
        });
    });

    describe('RDAP has no registration date, WHOIS has', () => {
        it('should prefer WHOIS when WHOIS has registeredAt and RDAP does not', () => {
            // Arrange
            const rdap = {
                registeredAt: null,
                status: RdapStatus.MISSING,
                checkedAt: mockDate,
            };

            const whois = {
                registeredAt: mockRegisteredDate,
                status: WhoisStatus.OK,
                checkedAt: mockDate,
            };

            (mapStatusToDomainStatus as Mock).mockReturnValue(DomainStatus.OK);

            // Act
            const result = pickBestKnown(rdap, whois);

            // Assert
            expect(result).toEqual({
                registeredAt: mockRegisteredDate,
                checkedAt: mockDate,
                source: DomainSource.WHOIS,
                status: DomainStatus.OK,
            });
            expect(mapStatusToDomainStatus).toHaveBeenCalledWith(WhoisStatus.OK);
        });

        it('should use WHOIS checkedAt when selecting WHOIS', () => {
            // Arrange
            const whoisCheckedAt = new Date('2024-01-15T09:30:00Z');
            const rdap = {
                registeredAt: null,
                status: RdapStatus.MISSING,
                checkedAt: mockDate,
            };

            const whois = {
                registeredAt: mockRegisteredDate,
                status: WhoisStatus.OK,
                checkedAt: whoisCheckedAt,
            };

            (mapStatusToDomainStatus as Mock).mockReturnValue(DomainStatus.OK);

            // Act
            const result = pickBestKnown(rdap, whois);

            // Assert
            expect(result.checkedAt).toBe(whoisCheckedAt);
            expect(result.source).toBe(DomainSource.WHOIS);
        });
    });

    describe('Neither has registration date', () => {
        it('should prefer WHOIS when WHOIS has higher priority status', () => {
            // Arrange
            const rdap = {
                registeredAt: null,
                status: RdapStatus.ERROR,
                checkedAt: mockDate,
            };

            const whois = {
                registeredAt: null,
                status: WhoisStatus.REDACTED,
                checkedAt: mockDate,
            };

            (mapStatusToDomainStatus as Mock)
                .mockReturnValueOnce(DomainStatus.ERROR) // First call for rdap
                .mockReturnValueOnce(DomainStatus.REDACTED); // Second call for whois

            (getStatusPriority as Mock)
                .mockReturnValueOnce(1) // ERROR priority
                .mockReturnValueOnce(4); // REDACTED priority

            // Act
            const result = pickBestKnown(rdap, whois);

            // Assert
            expect(result).toEqual({
                registeredAt: null,
                checkedAt: mockDate,
                source: DomainSource.RDAP,
                status: DomainStatus.ERROR,
            });
            expect(getStatusPriority).toHaveBeenCalledWith(DomainStatus.ERROR);
            expect(getStatusPriority).toHaveBeenCalledWith(DomainStatus.REDACTED);
        });

        it('should prefer RDAP when RDAP has higher priority status', () => {
            // Arrange
            const rdap = {
                registeredAt: null,
                status: RdapStatus.MISSING,
                checkedAt: mockDate,
            };

            const whois = {
                registeredAt: null,
                status: WhoisStatus.ERROR,
                checkedAt: mockDate,
            };

            console.log('Setting up mocks...');

            (mapStatusToDomainStatus as Mock).mockImplementation((status: RdapStatus | WhoisStatus) => {
                if (status === RdapStatus.MISSING) {
                    return DomainStatus.MISSING;
                }
                if (status === WhoisStatus.ERROR) {
                    return DomainStatus.ERROR;
                }
                return DomainStatus.UNKNOWN;
            });

            (getStatusPriority as Mock).mockImplementation((status: DomainStatus) => {
                if (status === DomainStatus.MISSING) return 3;
                if (status === DomainStatus.ERROR) return 1;
                return 0;
            });

            // Act
            const result = pickBestKnown(rdap, whois);

            console.log('Result:', result);
            console.log('Mock calls:', {
                mapStatusCalls: (mapStatusToDomainStatus as Mock).mock.calls,
                priorityCalls: (getStatusPriority as Mock).mock.calls,
            });

            // Assert
            expect(result.source).toBe(DomainSource.RDAP);
            expect(result.status).toBe(DomainStatus.MISSING);

            expect(mapStatusToDomainStatus).toHaveBeenCalledTimes(2);
            expect(mapStatusToDomainStatus).toHaveBeenCalledWith(RdapStatus.MISSING);
            expect(mapStatusToDomainStatus).toHaveBeenCalledWith(WhoisStatus.ERROR);

            expect(getStatusPriority).toHaveBeenCalledTimes(2);
            expect(getStatusPriority).toHaveBeenCalledWith(DomainStatus.MISSING);
            expect(getStatusPriority).toHaveBeenCalledWith(DomainStatus.ERROR);
        });

        it('should prefer RDAP when status priorities are equal', () => {
            // Arrange - Both have same status priority
            const rdap = {
                registeredAt: null,
                status: RdapStatus.MISSING,
                checkedAt: mockDate,
            };

            const whois = {
                registeredAt: null,
                status: WhoisStatus.MISSING,
                checkedAt: new Date('2024-01-15T09:30:00Z'), // Earlier check
            };

            (mapStatusToDomainStatus as Mock).mockReturnValue(DomainStatus.MISSING);

            (getStatusPriority as Mock).mockReturnValue(3); // Same priority for both

            // Act
            const result = pickBestKnown(rdap, whois);

            // Assert - Should default to RDAP when priorities are equal
            expect(result.source).toBe(DomainSource.RDAP);
        });
    });

    describe('WHOIS is null', () => {
        it('should use RDAP when WHOIS is null', () => {
            // Arrange
            const rdap = {
                registeredAt: mockRegisteredDate,
                status: RdapStatus.OK,
                checkedAt: mockDate,
            };

            (mapStatusToDomainStatus as Mock).mockReturnValue(DomainStatus.OK);

            // Act
            const result = pickBestKnown(rdap, null);

            // Assert
            expect(result.source).toBe(DomainSource.RDAP);
            expect(result.registeredAt).toBe(mockRegisteredDate);
        });

        it('should use RDAP when WHOIS is null and RDAP has no registration', () => {
            // Arrange
            const rdap = {
                registeredAt: null,
                status: RdapStatus.MISSING,
                checkedAt: mockDate,
            };

            (mapStatusToDomainStatus as Mock).mockReturnValue(DomainStatus.MISSING);

            // Act
            const result = pickBestKnown(rdap, null);

            // Assert
            expect(result).toEqual({
                registeredAt: null,
                checkedAt: mockDate,
                source: DomainSource.RDAP,
                status: DomainStatus.MISSING,
            });
        });

        it('should handle WHOIS as UNKNOWN when null', () => {
            // Arrange
            const rdap = {
                registeredAt: null,
                status: RdapStatus.ERROR,
                checkedAt: mockDate,
            };

            (mapStatusToDomainStatus as Mock)
                .mockReturnValueOnce(DomainStatus.ERROR)
                .mockReturnValueOnce(DomainStatus.UNKNOWN); // For null whois

            (getStatusPriority as Mock)
                .mockReturnValueOnce(1) // ERROR priority
                .mockReturnValueOnce(0); // UNKNOWN priority

            // Act
            const result = pickBestKnown(rdap, null);

            // Assert - Should use RDAP since ERROR > UNKNOWN
            expect(result.source).toBe(DomainSource.RDAP);
            expect(result.status).toBe(DomainStatus.ERROR);
        });
    });

    describe('Edge cases', () => {
        it('throws if RDAP.checkedAt is missing (invariant violation)', () => {
            const rdap = {
                registeredAt: mockRegisteredDate,
                status: RdapStatus.OK,
                checkedAt: undefined,
            } as RdapDomainParams;

            (mapStatusToDomainStatus as Mock).mockReturnValue(DomainStatus.OK);

            expect(() => pickBestKnown(rdap, null)).toThrow('Invariant violated: rdap.checkedAt is missing');
        });

        it('throws when WHOIS is selected but whois.checkedAt is missing (invariant)', () => {
            const rdap = {
                registeredAt: null,
                status: RdapStatus.ERROR,
                checkedAt: mockDate,
            } as RdapDomainParams;

            const whois = {
                registeredAt: null,
                status: WhoisStatus.REDACTED,
                checkedAt: undefined,
            } as WhoisDomainParams;

            (mapStatusToDomainStatus as Mock)
                .mockReturnValueOnce(DomainStatus.ERROR) // rdapStatus
                .mockReturnValueOnce(DomainStatus.REDACTED); // whoisStatus

            (getStatusPriority as Mock).mockReturnValueOnce(1).mockReturnValueOnce(4);

            expect(() => pickBestKnown(rdap, whois)).toThrow('Invariant violated: whois.checkedAt is missing');
        });

        it('should use non-null assertion for checkedAt in final return', () => {
            // This tests that the function handles the non-null assertion correctly
            const rdap = {
                registeredAt: null,
                status: RdapStatus.OK,
                checkedAt: mockDate,
            };

            (mapStatusToDomainStatus as Mock).mockReturnValue(DomainStatus.OK);

            const result = pickBestKnown(rdap, null);

            expect(result.checkedAt).toBe(mockDate);
        });
    });

    describe('Status priority comparisons', () => {
        const mockDate = new Date('2025-01-01T00:00:00Z');

        const statusCombinations = [
            { rdapStatus: RdapStatus.OK, whoisStatus: WhoisStatus.REDACTED, expectedSource: DomainSource.RDAP },
            { rdapStatus: RdapStatus.REDACTED, whoisStatus: WhoisStatus.MISSING, expectedSource: DomainSource.RDAP },
            // ...
        ];

        statusCombinations.forEach(({ rdapStatus, whoisStatus, expectedSource }) => {
            it(`selects ${expectedSource} when RDAP=${rdapStatus} WHOIS=${whoisStatus}`, () => {
                const rdap = { registeredAt: null, status: rdapStatus, checkedAt: mockDate } as RdapDomainParams;
                const whois = { registeredAt: null, status: whoisStatus, checkedAt: mockDate } as WhoisDomainParams;

                const result = pickBestKnown(rdap, whois);
                expect(result.source).toBe(expectedSource);
            });
        });
    });
});

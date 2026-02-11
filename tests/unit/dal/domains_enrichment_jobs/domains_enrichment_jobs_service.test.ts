import { describe, it, beforeEach, afterEach, expect, vi, Mock } from 'vitest';
import { DomainEnrichmentJobStatus, DomainSource, DomainStatus } from '@/generated/prisma/enums';
import { RdapDomainParams, RdapStatus } from '@/lib/rdap/rdap.types';
import { WhoisDomainParams, WhoisStatus } from '@/lib/whois/whois.types';
import { pickBestKnown } from '@/dal/domains/domains.service';
import { mapStatusToDomainStatus } from '@/dal/domains/domains.mapper';
import { getStatusPriority } from '@/lib/domain_enrichment_job/priority';
import { getDomainEnrichmentJobById } from '@/dal/domain_enrichment_jobs/domain_enrichment_jobs.repo';
import { getDomainById } from '@/dal/domains/domains.repo';
import { logger } from '@/lib/logging/logger';
import { generateDomainEnrichmentJobSummary } from '@/dal/domain_enrichment_jobs/domain_enrichment_jobs.service';
import { Domain, DomainEnrichmentJob } from '@/generated/prisma/client';

// Mock the dependencies
vi.mock('@/lib/domain_enrichment_job/priority', () => ({
    getStatusPriority: vi.fn(),
}));

vi.mock('@/dal/domains/domains.mapper', () => ({
    mapStatusToDomainStatus: vi.fn(),
}));

vi.mock('@/dal/domains/domains.repo', () => ({
    getDomainById: vi.fn(),
}));

vi.mock('@/dal/domain_enrichment_jobs/domain_enrichment_jobs.repo', () => ({
    getDomainEnrichmentJobById: vi.fn(),
}));

vi.mock('@/lib/logging/logger', () => ({
    logger: {
        warn: vi.fn(),
    },
}));

const mockGetDomainEnrichmentJobById = vi.mocked(getDomainEnrichmentJobById);
const mockGetDomainById = vi.mocked(getDomainById);
const mockLoggerWarn = logger.warn;


describe('Domain Enrichment Jobs service tests', () => {
    describe('Pick best known tests', () => {
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
            it('Should prefer RDAP when RDAP has registeredAt date', () => {
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

            it('Should use RDAP even if WHOIS has later checkedAt', () => {
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
            it('Should prefer WHOIS when WHOIS has registeredAt and RDAP does not', () => {
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

            it('Should use WHOIS checkedAt when selecting WHOIS', () => {
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
            it('Should prefer WHOIS when WHOIS has higher priority status', () => {
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

            it('Should prefer RDAP when RDAP has higher priority status', () => {
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

            it('Should prefer RDAP when status priorities are equal', () => {
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
            it('Should use RDAP when WHOIS is null', () => {
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

            it('Should use RDAP when WHOIS is null and RDAP has no registration', () => {
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

            it('Should handle WHOIS as UNKNOWN when null', () => {
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

            it('Should use non-null assertion for checkedAt in final return', () => {
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
                {
                    rdapStatus: RdapStatus.REDACTED,
                    whoisStatus: WhoisStatus.MISSING,
                    expectedSource: DomainSource.RDAP,
                },
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

    describe('Generate domain enrichment job summary tests', () => {
        const mockJobId = 'job-123';
        const mockDomainId = 'domain-456';

        const baseJob = {
            id: mockJobId,
            domainId: mockDomainId,
            status: DomainEnrichmentJobStatus.PENDING,
            runAfter: new Date(),
            attempts: 0,
            lastError: null,
            lockedUntil: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        } as DomainEnrichmentJob;

        const baseDomain = {
            id: mockDomainId,
            hostname: 'example.com',
            firstSeenAt: new Date(),
            source: DomainSource.UNKNOWN,
            status: DomainStatus.UNKNOWN,
            registeredAt: null,
            checkedAt: null,
            rdapRaw: null,
            rdapFetchedAt: null,
            whoisRaw: null,
            whoisFetchedAt: null,
            rdapFetchLockedUntil: null,
            whoisFetchLockedUntil: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        } as Domain;

        beforeEach(() => {
            vi.clearAllMocks();
        });

        afterEach(() => {
            vi.resetAllMocks();
        });

        it('Should return null and log warning when job is not found', async () => {
            // Arrange
            mockGetDomainEnrichmentJobById.mockResolvedValue(null);

            // Act
            const result = await generateDomainEnrichmentJobSummary(mockJobId);

            // Assert
            expect(mockGetDomainEnrichmentJobById).toHaveBeenCalledTimes(1);
            expect(mockGetDomainEnrichmentJobById).toHaveBeenCalledWith(mockJobId);
            expect(mockLoggerWarn).toHaveBeenCalledTimes(1);
            expect(mockLoggerWarn).toHaveBeenCalledWith(`Could not find domain enrichment job with ID=${mockJobId}`);
            expect(result).toBeNull();
            expect(mockGetDomainById).not.toHaveBeenCalled();
        });

        it('Should return null and log warning when domain is not found', async () => {
            // Arrange
            const job = { ...baseJob };
            mockGetDomainEnrichmentJobById.mockResolvedValue(job);
            mockGetDomainById.mockResolvedValue(null);

            // Act
            const result = await generateDomainEnrichmentJobSummary(mockJobId);

            // Assert
            expect(mockGetDomainEnrichmentJobById).toHaveBeenCalledTimes(1);
            expect(mockGetDomainEnrichmentJobById).toHaveBeenCalledWith(mockJobId);
            expect(mockGetDomainById).toHaveBeenCalledTimes(1);
            expect(mockGetDomainById).toHaveBeenCalledWith(mockDomainId);
            expect(mockLoggerWarn).toHaveBeenCalledTimes(1);
            expect(mockLoggerWarn).toHaveBeenCalledWith(`Could not find domain with ID=${mockDomainId}`);
            expect(result).toBeNull();
        });

        it('Should generate summary for domain with registeredAt date', async () => {
            // Arrange
            const job = {
                ...baseJob,
                status: DomainEnrichmentJobStatus.DONE,
            };
            const domain = {
                ...baseDomain,
                registeredAt: new Date('2020-01-01T00:00:00.000Z'),
                source: DomainSource.RDAP,
                status: DomainStatus.OK,
            };

            mockGetDomainEnrichmentJobById.mockResolvedValue(job);
            mockGetDomainById.mockResolvedValue(domain);

            // Act
            const result = await generateDomainEnrichmentJobSummary(mockJobId);

            // Assert
            expect(mockGetDomainEnrichmentJobById).toHaveBeenCalledWith(mockJobId);
            expect(mockGetDomainById).toHaveBeenCalledWith(mockDomainId);
            expect(mockLoggerWarn).not.toHaveBeenCalled();

            expect(result).toEqual({
                registeredAtFound: true,
                provider: DomainSource.RDAP,
                domainStatus: DomainStatus.OK,
                jobStatus: DomainEnrichmentJobStatus.DONE,
            });
        });

        it('Should generate summary for domain without registeredAt date', async () => {
            // Arrange
            const job = {
                ...baseJob,
                status: DomainEnrichmentJobStatus.PENDING,
            };
            const domain = {
                ...baseDomain,
                registeredAt: null, // No registration date
                source: DomainSource.WHOIS,
                status: DomainStatus.MISSING,
            };

            mockGetDomainEnrichmentJobById.mockResolvedValue(job);
            mockGetDomainById.mockResolvedValue(domain);

            // Act
            const result = await generateDomainEnrichmentJobSummary(mockJobId);

            // Assert
            expect(result).toEqual({
                registeredAtFound: false,
                provider: DomainSource.WHOIS,
                domainStatus: DomainStatus.MISSING,
                jobStatus: DomainEnrichmentJobStatus.PENDING,
            });
        });

        it('Should handle all DomainSource enum values', async () => {
            // Test for RDAP
            const job1 = { ...baseJob };
            const domain1 = {
                ...baseDomain,
                source: DomainSource.RDAP,
                registeredAt: new Date(),
            };

            mockGetDomainEnrichmentJobById.mockResolvedValue(job1);
            mockGetDomainById.mockResolvedValue(domain1);

            const result1 = await generateDomainEnrichmentJobSummary(mockJobId);
            expect(result1?.provider).toBe(DomainSource.RDAP);

            // Test for WHOIS
            const job2 = { ...baseJob };
            const domain2 = {
                ...baseDomain,
                source: DomainSource.WHOIS,
                registeredAt: new Date(),
            };

            mockGetDomainEnrichmentJobById.mockResolvedValue(job2);
            mockGetDomainById.mockResolvedValue(domain2);

            const result2 = await generateDomainEnrichmentJobSummary('job-2');
            expect(result2?.provider).toBe(DomainSource.WHOIS);

            // Test for UNKNOWN
            const job3 = { ...baseJob };
            const domain3 = {
                ...baseDomain,
                source: DomainSource.UNKNOWN,
                registeredAt: null,
            };

            mockGetDomainEnrichmentJobById.mockResolvedValue(job3);
            mockGetDomainById.mockResolvedValue(domain3);

            const result3 = await generateDomainEnrichmentJobSummary('job-3');
            expect(result3?.provider).toBe(DomainSource.UNKNOWN);
        });

        it('Should handle all DomainStatus enum values', async () => {
            const statuses = [
                DomainStatus.OK,
                DomainStatus.MISSING,
                DomainStatus.REDACTED,
                DomainStatus.ERROR,
                DomainStatus.UNSUPPORTED,
                DomainStatus.UNKNOWN,
            ];

            for (const domainStatus of statuses) {
                const job = { ...baseJob };
                const domain = {
                    ...baseDomain,
                    status: domainStatus,
                    registeredAt: new Date(),
                };

                mockGetDomainEnrichmentJobById.mockResolvedValue(job);
                mockGetDomainById.mockResolvedValue(domain);

                const result = await generateDomainEnrichmentJobSummary(`job-${domainStatus}`);
                expect(result?.domainStatus).toBe(domainStatus);
            }
        });

        it('Should handle all DomainEnrichmentJobStatus enum values', async () => {
            const statuses = [
                DomainEnrichmentJobStatus.PENDING,
                DomainEnrichmentJobStatus.RUNNING,
                DomainEnrichmentJobStatus.DONE,
                DomainEnrichmentJobStatus.ERROR,
            ];

            for (const jobStatus of statuses) {
                const job = { ...baseJob, status: jobStatus };
                const domain = {
                    ...baseDomain,
                    registeredAt: new Date(),
                };

                mockGetDomainEnrichmentJobById.mockResolvedValue(job);
                mockGetDomainById.mockResolvedValue(domain);

                const result = await generateDomainEnrichmentJobSummary(`job-${jobStatus}`);
                expect(result?.jobStatus).toBe(jobStatus);
            }
        });

        it('Should handle job with ERROR status and domain with ERROR status', async () => {
            // Arrange
            const job = {
                ...baseJob,
                status: DomainEnrichmentJobStatus.ERROR,
                lastError: 'Failed to fetch RDAP data',
            };
            const domain = {
                ...baseDomain,
                source: DomainSource.UNKNOWN,
                status: DomainStatus.ERROR,
                registeredAt: null,
            };

            mockGetDomainEnrichmentJobById.mockResolvedValue(job);
            mockGetDomainById.mockResolvedValue(domain);

            // Act
            const result = await generateDomainEnrichmentJobSummary(mockJobId);

            // Assert
            expect(result).toEqual({
                registeredAtFound: false,
                provider: DomainSource.UNKNOWN,
                domainStatus: DomainStatus.ERROR,
                jobStatus: DomainEnrichmentJobStatus.ERROR,
            });
        });

        it('Should handle job RUNNING with domain REDACTED status', async () => {
            // Arrange
            const job = {
                ...baseJob,
                status: DomainEnrichmentJobStatus.RUNNING,
            };
            const domain = {
                ...baseDomain,
                source: DomainSource.RDAP,
                status: DomainStatus.REDACTED,
                registeredAt: new Date('2021-06-15T00:00:00.000Z'),
            };

            mockGetDomainEnrichmentJobById.mockResolvedValue(job);
            mockGetDomainById.mockResolvedValue(domain);

            // Act
            const result = await generateDomainEnrichmentJobSummary(mockJobId);

            // Assert
            expect(result).toEqual({
                registeredAtFound: true,
                provider: DomainSource.RDAP,
                domainStatus: DomainStatus.REDACTED,
                jobStatus: DomainEnrichmentJobStatus.RUNNING,
            });
        });

        it('Should handle job DONE with domain UNSUPPORTED status', async () => {
            // Arrange
            const job = {
                ...baseJob,
                status: DomainEnrichmentJobStatus.DONE,
            };
            const domain = {
                ...baseDomain,
                source: DomainSource.WHOIS,
                status: DomainStatus.UNSUPPORTED,
                registeredAt: null,
            };

            mockGetDomainEnrichmentJobById.mockResolvedValue(job);
            mockGetDomainById.mockResolvedValue(domain);

            // Act
            const result = await generateDomainEnrichmentJobSummary(mockJobId);

            // Assert
            expect(result).toEqual({
                registeredAtFound: false,
                provider: DomainSource.WHOIS,
                domainStatus: DomainStatus.UNSUPPORTED,
                jobStatus: DomainEnrichmentJobStatus.DONE,
            });
        });

        it('Should handle job with future registeredAt date', async () => {
            // Arrange
            const job = { ...baseJob };
            const futureDate = new Date(Date.now() + 86400000); // +1 day
            const domain = {
                ...baseDomain,
                registeredAt: futureDate,
            };

            mockGetDomainEnrichmentJobById.mockResolvedValue(job);
            mockGetDomainById.mockResolvedValue(domain);

            // Act
            const result = await generateDomainEnrichmentJobSummary(mockJobId);

            // Assert
            expect(result?.registeredAtFound).toBe(true);
        });

        it('Should handle job with past registeredAt date', async () => {
            // Arrange
            const job = { ...baseJob };
            const pastDate = new Date('2010-05-20T00:00:00.000Z');
            const domain = {
                ...baseDomain,
                registeredAt: pastDate,
            };

            mockGetDomainEnrichmentJobById.mockResolvedValue(job);
            mockGetDomainById.mockResolvedValue(domain);

            // Act
            const result = await generateDomainEnrichmentJobSummary(mockJobId);

            // Assert
            expect(result?.registeredAtFound).toBe(true);
        });

        it('Should not include other domain fields in summary', async () => {
            // Arrange
            const job = { ...baseJob };
            const domain = {
                ...baseDomain,
                registeredAt: new Date(),
                hostname: 'test.example.com',
                firstSeenAt: new Date(),
                // ... other fields that Should NOT be in summary
            };

            mockGetDomainEnrichmentJobById.mockResolvedValue(job);
            mockGetDomainById.mockResolvedValue(domain);

            // Act
            const result = await generateDomainEnrichmentJobSummary(mockJobId);

            // Assert
            expect(result).toMatchObject({
                registeredAtFound: expect.any(Boolean),
                provider: expect.any(String),
                domainStatus: expect.any(String),
                jobStatus: expect.any(String),
            });

            // Ensure only expected fields are present
            const resultKeys = Object.keys(result || {});
            expect(resultKeys).toEqual(['registeredAtFound', 'provider', 'domainStatus', 'jobStatus']);
        });

        it('Should handle concurrent calls with different job IDs', async () => {
            // Arrange
            const jobs = [
                { id: 'job-1', domainId: 'domain-1', status: DomainEnrichmentJobStatus.PENDING },
                { id: 'job-2', domainId: 'domain-2', status: DomainEnrichmentJobStatus.RUNNING },
                { id: 'job-3', domainId: 'domain-3', status: DomainEnrichmentJobStatus.DONE },
            ];

            const domains = [
                { id: 'domain-1', source: DomainSource.RDAP, status: DomainStatus.OK, registeredAt: new Date() },
                { id: 'domain-2', source: DomainSource.WHOIS, status: DomainStatus.MISSING, registeredAt: null },
                { id: 'domain-3', source: DomainSource.UNKNOWN, status: DomainStatus.ERROR, registeredAt: null },
            ];

            // Setup mocks for each call
            jobs.forEach((job, index) => {
                mockGetDomainEnrichmentJobById.mockResolvedValueOnce({ ...baseJob, ...job } as DomainEnrichmentJob);
                mockGetDomainById.mockResolvedValueOnce({ ...baseDomain, ...domains[index] } as Domain);
            });

            // Act - make concurrent calls
            const promises = jobs.map((job) => generateDomainEnrichmentJobSummary(job.id));
            const results = await Promise.all(promises);

            // Assert
            expect(results).toHaveLength(3);

            expect(results[0]).toEqual({
                registeredAtFound: true,
                provider: DomainSource.RDAP,
                domainStatus: DomainStatus.OK,
                jobStatus: DomainEnrichmentJobStatus.PENDING,
            });

            expect(results[1]).toEqual({
                registeredAtFound: false,
                provider: DomainSource.WHOIS,
                domainStatus: DomainStatus.MISSING,
                jobStatus: DomainEnrichmentJobStatus.RUNNING,
            });

            expect(results[2]).toEqual({
                registeredAtFound: false,
                provider: DomainSource.UNKNOWN,
                domainStatus: DomainStatus.ERROR,
                jobStatus: DomainEnrichmentJobStatus.DONE,
            });
        });

        it('Should propagate errors from getDomainEnrichmentJobById', async () => {
            // Arrange
            const error = new Error('Database connection failed');
            mockGetDomainEnrichmentJobById.mockRejectedValue(error);

            // Act & Assert
            await expect(generateDomainEnrichmentJobSummary(mockJobId)).rejects.toThrow('Database connection failed');
            expect(mockGetDomainEnrichmentJobById).toHaveBeenCalledTimes(1);
            expect(mockGetDomainById).not.toHaveBeenCalled();
        });

        it('Should propagate errors from getDomainById', async () => {
            // Arrange
            const job = { ...baseJob };
            const error = new Error('Domain query failed');

            mockGetDomainEnrichmentJobById.mockResolvedValue(job);
            mockGetDomainById.mockRejectedValue(error);

            // Act & Assert
            await expect(generateDomainEnrichmentJobSummary(mockJobId)).rejects.toThrow('Domain query failed');
            expect(mockGetDomainEnrichmentJobById).toHaveBeenCalledTimes(1);
            expect(mockGetDomainById).toHaveBeenCalledTimes(1);
        });
    });
});

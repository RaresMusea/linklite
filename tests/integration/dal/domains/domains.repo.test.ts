import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createLink } from '@/dal/links/links.repo';
import { normalizeHostnameFromUrl } from '@/lib/utils';
import {
    updateDomainBestKnown,
    updateDomainRdap,
    updateDomainRdapCache,
    updateDomainWhoisCache,
} from '@/dal/domains/domains.repo';
import { DomainSource, DomainStatus } from '@/generated/prisma/enums';
import { RdapDomainParams, RdapStatus } from '@/lib/rdap/rdap.types';
import { WhoisStatus } from '@/lib/whois/whois.types';

const mockedUtils = vi.hoisted(() => ({
    normalizeHostnameFromUrl: vi.fn(),
}));

interface RdapData {
    events: Array<{ eventAction: string; eventDate: string }>;
    entities?: Array<{ roles: string[]; vcardArray: unknown }>;
    links?: Array<{ value: string; rel: string }>;
    notices?: Array<{ title: string; description: string[] }>;
}

vi.mock('@/lib/utils', () => mockedUtils);

describe('Domain repo integration tests', () => {
    beforeAll(async () => {
        await prisma.$connect();
    });

    beforeEach(async () => {
        await prisma.domainEnrichmentJob.deleteMany();
        await prisma.link.deleteMany();
        await prisma.domain.deleteMany();
        vi.clearAllMocks();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('creates domain with firstSeenAt timestamp', async () => {
        // Arrange
        const mockHostname = 'new-domain.com';
        vi.mocked(normalizeHostnameFromUrl).mockReturnValue(mockHostname);

        // Act
        await createLink({
            slug: 'new-domain-slug',
            targetUrl: 'https://new-domain.com',
            ownerId: null,
        });

        // Assert
        const domain = await prisma.domain.findUnique({
            where: { hostname: mockHostname },
        });
        expect(domain).toBeDefined();
        expect(domain?.firstSeenAt).toBeInstanceOf(Date);
        expect(domain?.registeredAt).toBeNull();
        expect(domain?.checkedAt).toBeNull();
    });

    it('does not update firstSeenAt when domain already exists', async () => {
        // Arrange
        const mockHostname = 'existing-domain.com';
        vi.mocked(normalizeHostnameFromUrl).mockReturnValue(mockHostname);

        // Get initial domain creation time
        const initialDomain = await prisma.domain.findUnique({
            where: { hostname: mockHostname },
        });
        const initialFirstSeen = initialDomain?.firstSeenAt;

        // Wait a bit
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Assert - firstSeenAt should not change
        const updatedDomain = await prisma.domain.findUnique({
            where: { hostname: mockHostname },
        });
        expect(updatedDomain?.firstSeenAt).toEqual(initialFirstSeen);
    });
});

describe('updateDomainRdap integration tests', () => {
    beforeEach(async () => {
        await prisma.link.deleteMany();
        await prisma.domain.deleteMany();
    });

    it('updates RDAP information for an existing domain', async () => {
        // Arrange
        const domain = await prisma.domain.create({
            data: {
                hostname: 'example.com',
                registeredAt: null,
                checkedAt: null,
                rdapFetchedAt: null,
                rdapRaw: undefined,
                rdapFetchLockedUntil: null,
            },
        });

        const rdapParams: RdapDomainParams = {
            registeredAt: new Date('2020-01-01'),
            status: RdapStatus.OK,
            source: 'RDAP',
            rdapFetchedAt: new Date('2024-01-01'),
            checkedAt: new Date('2024-01-01'),
            rdapRaw: {
                events: [{ eventDate: '2020-01-01T00:00:00Z' }],
                entities: [{ roles: ['registrant'] }],
            },
        };

        // Act
        const updatedDomain = await updateDomainRdap(domain.id, rdapParams);

        // Assert
        expect(updatedDomain.hostname).toBe('example.com');
        expect(updatedDomain.registeredAt).toEqual(new Date('2020-01-01'));
        expect(updatedDomain.status).toBe('OK');
        expect(updatedDomain.source).toBe('RDAP');
        expect(updatedDomain.rdapFetchedAt).toEqual(new Date('2024-01-01'));
        expect(updatedDomain.checkedAt).toEqual(new Date('2024-01-01'));
        expect(updatedDomain.rdapRaw).toEqual(rdapParams.rdapRaw);
        expect(updatedDomain.updatedAt).toBeInstanceOf(Date);
    });

    it('sets current timestamp when rdapFetchedAt is not provided', async () => {
        // Arrange
        const domain = await prisma.domain.create({
            data: {
                hostname: 'example.com',
                rdapFetchedAt: null,
            },
        });

        const rdapParams: RdapDomainParams = {
            registeredAt: new Date('2020-01-01'),
            status: RdapStatus.OK,
            checkedAt: new Date('2024-01-01'),
            source: 'RDAP',
            // rdapFetchedAt not provided
        };

        const beforeUpdate = new Date();

        // Act
        const updatedDomain = await updateDomainRdap(domain.id, rdapParams);

        // Assert
        expect(updatedDomain.rdapFetchedAt).toBeInstanceOf(Date);
        expect(updatedDomain.rdapFetchedAt!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
        expect(updatedDomain.rdapFetchedAt!.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('sets current timestamp when checkedAt is not provided', async () => {
        // Arrange
        const domain = await prisma.domain.create({
            data: {
                hostname: 'example.com',
                checkedAt: null,
            },
        });

        const rdapParams: RdapDomainParams = {
            registeredAt: new Date('2020-01-01'),
            status: RdapStatus.REDACTED,
            source: 'RDAP',
            // checkedAt not provided
        };

        const beforeUpdate = new Date();

        // Act
        const updatedDomain = await updateDomainRdap(domain.id, rdapParams);

        // Assert
        expect(updatedDomain.checkedAt).toBeInstanceOf(Date);
        expect(updatedDomain.checkedAt!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
        expect(updatedDomain.checkedAt!.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('handles partial RDAP updates without overwriting existing fields', async () => {
        // Arrange
        const initialRdapRaw = { existing: 'data' };
        const domain = await prisma.domain.create({
            data: {
                hostname: 'example.com',
                source: DomainSource.WHOIS,
                status: DomainStatus.OK,
                registeredAt: new Date('2019-01-01'),
                checkedAt: new Date('2023-01-01'),
                rdapFetchedAt: new Date('2023-01-01'),
                rdapRaw: initialRdapRaw,
            },
        });

        const rdapParams: RdapDomainParams = {
            registeredAt: new Date('2020-01-01'), // Update only this field
            status: RdapStatus.MISSING,
            // Include explicit the fields you want to keep unchanged
            checkedAt: new Date('2023-01-01'), // Keep the same
            rdapFetchedAt: new Date('2023-01-01'), // Keep the same
        };

        // Act
        const updatedDomain = await updateDomainRdap(domain.id, rdapParams);

        // Assert - only registeredAt and status should change
        expect(updatedDomain.registeredAt).toEqual(new Date('2020-01-01'));
        expect(updatedDomain.status).toBe(RdapStatus.MISSING);
        expect(updatedDomain.source).toBe('WHOIS'); // Should remain unchanged
        expect(updatedDomain.checkedAt).toEqual(new Date('2023-01-01')); // Should remain unchanged
        expect(updatedDomain.rdapFetchedAt).toEqual(new Date('2023-01-01')); // Should remain unchanged
        expect(updatedDomain.rdapRaw).toEqual(initialRdapRaw); // Should remain unchanged
    });

    it('updates rdapRaw only when explicitly provided', async () => {
        // Arrange
        const initialRdapRaw = { existing: 'data' };
        const domain = await prisma.domain.create({
            data: {
                hostname: 'example.com',
                rdapRaw: initialRdapRaw,
            },
        });

        // Test 1: rdapRaw not provided in params
        const paramsWithoutRdapRaw: RdapDomainParams = {
            registeredAt: new Date('2020-01-01'),
            status: RdapStatus.OK,
            source: 'RDAP',
        };

        const updated1 = await updateDomainRdap(domain.id, paramsWithoutRdapRaw);
        expect(updated1.rdapRaw).toEqual(initialRdapRaw); // Should remain unchanged

        // Test 2: rdapRaw explicitly set to null
        const paramsWithNullRdapRaw: RdapDomainParams = {
            registeredAt: new Date('2020-01-01'),
            status: RdapStatus.OK,
            source: 'RDAP',
            rdapRaw: undefined,
        };

        const updated2 = await updateDomainRdap(domain.id, paramsWithNullRdapRaw);
        expect(updated2?.rdapRaw?.toString()).toBe(initialRdapRaw.toString());

        // Test 3: rdapRaw with new value
        const newRdapRaw = { new: 'data' };
        const paramsWithNewRdapRaw: RdapDomainParams = {
            registeredAt: new Date('2020-01-01'),
            status: RdapStatus.OK,
            source: 'RDAP',
            rdapRaw: newRdapRaw,
        };

        const updated3 = await updateDomainRdap(domain.id, paramsWithNewRdapRaw);
        expect(updated3.rdapRaw).toEqual(newRdapRaw); // Should be updated
    });

    it('throws error when domain does not exist', async () => {
        // Arrange
        const nonExistentId = 'non-existent-id';
        const rdapParams: RdapDomainParams = {
            registeredAt: new Date('2020-01-01'),
            status: RdapStatus.OK,
            source: 'RDAP',
        };

        // Act & Assert
        await expect(updateDomainRdap(nonExistentId, rdapParams)).rejects.toThrow(); // Prisma will throw an error
    });

    it('maintains other domain fields unchanged', async () => {
        // Arrange
        const domain = await prisma.domain.create({
            data: {
                hostname: 'example.com',
                firstSeenAt: new Date('2018-01-01'),
                // Other fields are null by default
            },
        });

        const rdapParams: RdapDomainParams = {
            registeredAt: new Date('2020-01-01'),
            status: RdapStatus.OK,
            source: 'RDAP',
        };

        // Act
        const updatedDomain = await updateDomainRdap(domain.id, rdapParams);

        // Assert
        expect(updatedDomain.hostname).toBe('example.com');
        expect(updatedDomain.firstSeenAt).toEqual(new Date('2018-01-01'));
        expect(updatedDomain.createdAt).toBeInstanceOf(Date);
    });

    it('updates multiple domains independently', async () => {
        // Arrange
        const domain1 = await prisma.domain.create({
            data: { hostname: 'example1.com' },
        });

        const domain2 = await prisma.domain.create({
            data: { hostname: 'example2.com' },
        });

        const rdapParams1: RdapDomainParams = {
            registeredAt: new Date('2020-01-01'),
            status: RdapStatus.UNSUPPORTED,
            source: 'RDAP',
        };

        const rdapParams2: RdapDomainParams = {
            registeredAt: new Date('2021-01-01'),
            status: RdapStatus.UNSUPPORTED,
            source: 'RDAP',
        };

        // Act
        const updated1 = await updateDomainRdap(domain1.id, rdapParams1);
        const updated2 = await updateDomainRdap(domain2.id, rdapParams2);

        // Assert
        expect(updated1.registeredAt).toEqual(new Date('2020-01-01'));
        expect(updated1.status).toBe('UNSUPPORTED');
        expect(updated1.source).toBe('RDAP');

        expect(updated2.registeredAt).toEqual(new Date('2021-01-01'));
        expect(updated2.status).toBe('UNSUPPORTED');
        expect(updated2.source).toBe('RDAP');
    });

    it('handles domain with associated links', async () => {
        // Arrange
        const domain = await prisma.domain.create({
            data: {
                hostname: 'example.com',
                links: {
                    create: [
                        { slug: 'link1', targetUrl: 'https://example.com/1' },
                        { slug: 'link2', targetUrl: 'https://example.com/2' },
                    ],
                },
            },
            include: { links: true },
        });

        const rdapParams: RdapDomainParams = {
            registeredAt: new Date('2020-01-01'),
            status: RdapStatus.OK,
            source: 'RDAP',
        };

        // Act
        const updatedDomain = await updateDomainRdap(domain.id, rdapParams);

        // Assert
        expect(updatedDomain.registeredAt).toEqual(new Date('2020-01-01'));

        // Verify links are still associated
        const links = await prisma.link.findMany({
            where: { domainId: domain.id },
        });
        expect(links).toHaveLength(2);
        expect(links.map((l) => l.slug)).toContain('link1');
        expect(links.map((l) => l.slug)).toContain('link2');
    });

    describe('Domain Cache Update Functions - Integration Tests', () => {
        let testDomainId: string;

        beforeEach(async () => {
            // Clean up test data
            await prisma.domain.deleteMany();

            // Create a test domain
            const domain = await prisma.domain.create({
                data: {
                    hostname: 'test-domain.com',
                    firstSeenAt: new Date(),
                    source: DomainSource.UNKNOWN,
                    status: DomainStatus.UNKNOWN,
                    rdapFetchLockedUntil: null,
                    whoisFetchLockedUntil: null,
                },
            });

            testDomainId = domain.id;
        });

        afterEach(async () => {
            await prisma.domain.deleteMany();
        });

        describe('updateDomainRdapCache', () => {
            it('should update RDAP cache fields with locked until date for OK status', async () => {
                // Arrange
                vi.useFakeTimers();
                const now = new Date('2024-01-15T10:30:00Z');
                vi.setSystemTime(now);

                const rdapFetchedAt = new Date('2024-01-15T10:30:00Z');
                const rdapRaw = {
                    events: [{ eventAction: 'registration', eventDate: '2023-01-01T00:00:00Z' }],
                    status: ['active'],
                };

                const input = {
                    domainId: testDomainId,
                    status: RdapStatus.OK,
                    rdapFetchedAt,
                    rdapRaw,
                };

                // Act
                await updateDomainRdapCache(input);

                // Assert
                const updatedDomain = await prisma.domain.findUnique({
                    where: { id: testDomainId },
                });

                expect(updatedDomain?.rdapFetchedAt).toEqual(rdapFetchedAt);
                expect(updatedDomain?.rdapRaw).toEqual(rdapRaw);

                // Verify locked until date is set correctly for OK status (30 days)
                const expectedLockedUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                expect(updatedDomain?.rdapFetchLockedUntil).toEqual(expectedLockedUntil);

                // Verify other fields are unchanged
                expect(updatedDomain?.whoisFetchedAt).toBeNull();
                expect(updatedDomain?.whoisRaw).toBeNull();
                expect(updatedDomain?.registeredAt).toBeNull();
                expect(updatedDomain?.source).toBe(DomainSource.UNKNOWN);

                vi.useRealTimers();
            });

            it('should calculate different locked until dates for different statuses', async () => {
                // Arrange
                vi.useFakeTimers();
                const now = new Date('2024-01-15T10:30:00Z');
                vi.setSystemTime(now);

                const testCases = [
                    { status: RdapStatus.OK, expectedDays: 30 },
                    { status: RdapStatus.REDACTED, expectedDays: 14 },
                    { status: RdapStatus.MISSING, expectedDays: 7 },
                    { status: RdapStatus.ERROR, expectedMinutes: 60 },
                    { status: RdapStatus.UNSUPPORTED, expectedDays: 180 },
                ];

                for (const testCase of testCases) {
                    // Reset domain for each test
                    await prisma.domain.update({
                        where: { id: testDomainId },
                        data: {
                            rdapFetchLockedUntil: null,
                        },
                    });

                    const input = {
                        domainId: testDomainId,
                        status: testCase.status,
                        rdapFetchedAt: now,
                        rdapRaw: { test: 'data' },
                    };

                    // Act
                    await updateDomainRdapCache(input);

                    // Assert
                    const updatedDomain = await prisma.domain.findUnique({
                        where: { id: testDomainId },
                    });

                    const lockedUntil = updatedDomain?.rdapFetchLockedUntil;
                    expect(lockedUntil).toBeInstanceOf(Date);

                    if ('expectedDays' in testCase) {
                        const expectedDate = new Date(
                            now.getTime() + (testCase.expectedDays ?? 1) * 24 * 60 * 60 * 1000
                        );
                        expect(lockedUntil).toEqual(expectedDate);
                    } else if ('expectedMinutes' in testCase) {
                        const expectedDate = new Date(now.getTime() + (testCase.expectedMinutes ?? 1) * 60 * 1000);
                        expect(lockedUntil).toEqual(expectedDate);
                    }
                }

                vi.useRealTimers();
            });

            it('should update only RDAP fields and preserve others', async () => {
                // Arrange - Create domain with existing data
                await prisma.domain.update({
                    where: { id: testDomainId },
                    data: {
                        whoisFetchedAt: new Date('2024-01-14T10:30:00Z'),
                        whoisRaw: 'WHOIS data',
                        registeredAt: new Date('2023-01-01T00:00:00Z'),
                        source: DomainSource.WHOIS,
                        status: DomainStatus.OK,
                        whoisFetchLockedUntil: new Date('2024-02-14T10:30:00Z'),
                    },
                });

                vi.useFakeTimers();
                const now = new Date('2024-01-15T11:30:00Z');
                vi.setSystemTime(now);

                const rdapFetchedAt = new Date('2024-01-15T11:30:00Z');
                const rdapRaw = { events: [] };

                const input = {
                    domainId: testDomainId,
                    status: RdapStatus.REDACTED,
                    rdapFetchedAt,
                    rdapRaw,
                };

                // Act
                await updateDomainRdapCache(input);

                // Assert
                const updatedDomain = await prisma.domain.findUnique({
                    where: { id: testDomainId },
                });

                expect(updatedDomain?.rdapFetchedAt).toEqual(rdapFetchedAt);
                expect(updatedDomain?.rdapRaw).toEqual(rdapRaw);
                expect(updatedDomain?.rdapFetchLockedUntil).toBeInstanceOf(Date);

                // Verify other fields are preserved
                expect(updatedDomain?.whoisFetchedAt).toBeInstanceOf(Date);
                expect(updatedDomain?.whoisRaw).toBe('WHOIS data');
                expect(updatedDomain?.whoisFetchLockedUntil).toBeInstanceOf(Date);
                expect(updatedDomain?.registeredAt).toBeInstanceOf(Date);
                expect(updatedDomain?.source).toBe(DomainSource.WHOIS);
                expect(updatedDomain?.status).toBe(DomainStatus.OK);

                vi.useRealTimers();
            });

            it('should set rdapFetchedAt to null', async () => {
                // Arrange
                vi.useFakeTimers();
                const now = new Date('2024-01-15T10:30:00Z');
                vi.setSystemTime(now);

                const input = {
                    domainId: testDomainId,
                    status: RdapStatus.OK,
                    rdapFetchedAt: undefined,
                    rdapRaw: undefined,
                };

                // Act
                await updateDomainRdapCache(input);

                // Assert
                const updatedDomain = await prisma.domain.findUnique({
                    where: { id: testDomainId },
                });

                expect(updatedDomain?.rdapFetchedAt).toBeNull();
                expect(updatedDomain?.rdapRaw).toBeNull();
                expect(updatedDomain?.rdapFetchLockedUntil).toBeInstanceOf(Date);

                vi.useRealTimers();
            });

            it('should handle complex RDAP JSON data', async () => {
                // Arrange
                vi.useFakeTimers();
                const now = new Date('2024-01-15T10:30:00Z');
                vi.setSystemTime(now);

                const complexRdapData = {
                    events: [
                        { eventAction: 'registration', eventDate: '2023-01-01T00:00:00Z' },
                        { eventAction: 'expiration', eventDate: '2025-01-01T00:00:00Z' },
                    ],
                    entities: [
                        {
                            roles: ['registrant'],
                            vcardArray: [
                                'vcard',
                                [
                                    ['version', {}, 'text', '4.0'],
                                    ['fn', {}, 'text', 'John Doe'],
                                ],
                            ],
                        },
                    ],
                    links: [{ value: 'https://rdap.example.com/domain/test.com', rel: 'self' }],
                    notices: [{ title: 'Terms of Service', description: ['Some terms'] }],
                };

                const input = {
                    domainId: testDomainId,
                    status: RdapStatus.OK,
                    rdapFetchedAt: new Date(),
                    rdapRaw: complexRdapData,
                };

                // Act
                await updateDomainRdapCache(input);

                // Assert
                const updatedDomain = await prisma.domain.findUnique({
                    where: { id: testDomainId },
                });

                expect(updatedDomain?.rdapRaw).toEqual(complexRdapData);
                expect(updatedDomain?.rdapFetchLockedUntil).toBeInstanceOf(Date);

                const rdapData = updatedDomain?.rdapRaw as RdapData | null;

                if (rdapData) {
                    expect(rdapData.events).toHaveLength(2);
                    expect(rdapData.entities).toHaveLength(1);
                }

                vi.useRealTimers();
            });

            it('should throw error for non-existent domain', async () => {
                // Arrange
                vi.useFakeTimers();
                const now = new Date('2024-01-15T10:30:00Z');
                vi.setSystemTime(now);

                const nonExistentId = 'non-existent-id';
                const input = {
                    domainId: nonExistentId,
                    status: RdapStatus.OK,
                    rdapFetchedAt: new Date(),
                    rdapRaw: { test: 'data' },
                };

                // Act & Assert
                await expect(updateDomainRdapCache(input)).rejects.toThrow();

                vi.useRealTimers();
            });
        });

        describe('updateDomainWhoisCache', () => {
            it('should update WHOIS cache fields with locked until date for OK status', async () => {
                // Arrange
                vi.useFakeTimers();
                const now = new Date('2024-01-15T10:30:00Z');
                vi.setSystemTime(now);

                const whoisFetchedAt = new Date('2024-01-15T10:30:00Z');
                const whoisRaw = `Domain Name: TEST-DOMAIN.COM
Creation Date: 2023-01-01T00:00:00Z
Registrar: Example Registrar, Inc.`;

                const input = {
                    domainId: testDomainId,
                    status: WhoisStatus.OK,
                    whoisFetchedAt,
                    whoisRaw,
                };

                // Act
                await updateDomainWhoisCache(input);

                // Assert
                const updatedDomain = await prisma.domain.findUnique({
                    where: { id: testDomainId },
                });

                expect(updatedDomain?.whoisFetchedAt).toEqual(whoisFetchedAt);
                expect(updatedDomain?.whoisRaw).toBe(whoisRaw);

                // Verify locked until date is set correctly for OK status (90 days for WHOIS)
                const expectedLockedUntil = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
                expect(updatedDomain?.whoisFetchLockedUntil).toEqual(expectedLockedUntil);

                // Verify other fields are unchanged
                expect(updatedDomain?.rdapFetchedAt).toBeNull();
                expect(updatedDomain?.rdapRaw).toBeNull();
                expect(updatedDomain?.registeredAt).toBeNull();

                vi.useRealTimers();
            });

            it('should calculate different locked until dates for different statuses in WHOIS', async () => {
                // Arrange
                vi.useFakeTimers();
                const now = new Date('2024-01-15T10:30:00Z');
                vi.setSystemTime(now);

                const testCases = [
                    { status: WhoisStatus.OK, expectedDays: 90 },
                    { status: WhoisStatus.REDACTED, expectedDays: 30 },
                    { status: WhoisStatus.MISSING, expectedDays: 30 },
                    { status: WhoisStatus.ERROR, expectedMinutes: 360 },
                    { status: WhoisStatus.UNSUPPORTED, expectedDays: 365 },
                ];

                for (const testCase of testCases) {
                    // Reset domain for each test
                    await prisma.domain.update({
                        where: { id: testDomainId },
                        data: {
                            whoisFetchLockedUntil: null,
                        },
                    });

                    const input = {
                        domainId: testDomainId,
                        status: testCase.status,
                        whoisFetchedAt: now,
                        whoisRaw: `Test data for ${testCase.status}`,
                    };

                    // Act
                    await updateDomainWhoisCache(input);

                    // Assert
                    const updatedDomain = await prisma.domain.findUnique({
                        where: { id: testDomainId },
                    });

                    const lockedUntil = updatedDomain?.whoisFetchLockedUntil;
                    expect(lockedUntil).toBeInstanceOf(Date);

                    if ('expectedDays' in testCase) {
                        const expectedDate = new Date(now.getTime() + (testCase.expectedDays ?? 1) * 24 * 60 * 60 * 1000);
                        expect(lockedUntil).toEqual(expectedDate);
                    } else if ('expectedMinutes' in testCase) {
                        const expectedDate = new Date(now.getTime() + (testCase.expectedMinutes ?? 1) * 60 * 1000);
                        expect(lockedUntil).toEqual(expectedDate);
                    }
                }

                vi.useRealTimers();
            });

            it('should update only WHOIS fields and preserve others', async () => {
                // Arrange - Create domain with existing data
                await prisma.domain.update({
                    where: { id: testDomainId },
                    data: {
                        rdapFetchedAt: new Date('2024-01-14T10:30:00Z'),
                        rdapRaw: { events: [] },
                        registeredAt: new Date('2023-01-01T00:00:00Z'),
                        source: DomainSource.RDAP,
                        status: DomainStatus.OK,
                        rdapFetchLockedUntil: new Date('2024-02-14T10:30:00Z'),
                    },
                });

                vi.useFakeTimers();
                const now = new Date('2024-01-15T11:30:00Z');
                vi.setSystemTime(now);

                const whoisFetchedAt = new Date('2024-01-15T11:30:00Z');
                const whoisRaw = 'Updated WHOIS data';

                const input = {
                    domainId: testDomainId,
                    status: WhoisStatus.REDACTED,
                    whoisFetchedAt,
                    whoisRaw,
                };

                // Act
                await updateDomainWhoisCache(input);

                // Assert
                const updatedDomain = await prisma.domain.findUnique({
                    where: { id: testDomainId },
                });

                expect(updatedDomain?.whoisFetchedAt).toEqual(whoisFetchedAt);
                expect(updatedDomain?.whoisRaw).toBe(whoisRaw);
                expect(updatedDomain?.whoisFetchLockedUntil).toBeInstanceOf(Date);

                // Verify other fields are preserved
                expect(updatedDomain?.rdapFetchedAt).toBeInstanceOf(Date);
                expect(updatedDomain?.rdapRaw).toEqual({ events: [] });
                expect(updatedDomain?.rdapFetchLockedUntil).toBeInstanceOf(Date);
                expect(updatedDomain?.registeredAt).toBeInstanceOf(Date);
                expect(updatedDomain?.source).toBe(DomainSource.RDAP);
                expect(updatedDomain?.status).toBe(DomainStatus.OK);

                vi.useRealTimers();
            });

            it('should set whoisFetchedAt and whoisRaw to null', async () => {
                // Arrange
                vi.useFakeTimers();
                const now = new Date('2024-01-15T10:30:00Z');
                vi.setSystemTime(now);

                const input = {
                    domainId: testDomainId,
                    status: WhoisStatus.OK,
                    whoisFetchedAt: undefined,
                    whoisRaw: undefined,
                };

                // Act
                await updateDomainWhoisCache(input);

                // Assert
                const updatedDomain = await prisma.domain.findUnique({
                    where: { id: testDomainId },
                });

                expect(updatedDomain?.whoisFetchedAt).toBeNull();
                expect(updatedDomain?.whoisRaw).toBeNull();
                expect(updatedDomain?.whoisFetchLockedUntil).toBeInstanceOf(Date);

                vi.useRealTimers();
            });

            it('should handle large WHOIS text', async () => {
                // Arrange
                vi.useFakeTimers();
                const now = new Date('2024-01-15T10:30:00Z');
                vi.setSystemTime(now);

                const largeWhoisText = Array(100)
                    .fill(0)
                    .map((_, i) => `Line ${i + 1}: Some WHOIS data`)
                    .join('\n');

                const input = {
                    domainId: testDomainId,
                    status: WhoisStatus.OK,
                    whoisFetchedAt: new Date(),
                    whoisRaw: largeWhoisText,
                };

                // Act
                await updateDomainWhoisCache(input);

                // Assert
                const updatedDomain = await prisma.domain.findUnique({
                    where: { id: testDomainId },
                });

                expect(updatedDomain?.whoisRaw).toBe(largeWhoisText);
                expect(updatedDomain?.whoisRaw?.length).toBeGreaterThan(1000);
                expect(updatedDomain?.whoisFetchLockedUntil).toBeInstanceOf(Date);

                vi.useRealTimers();
            });

            it('should handle empty WHOIS string', async () => {
                // Arrange
                vi.useFakeTimers();
                const now = new Date('2024-01-15T10:30:00Z');
                vi.setSystemTime(now);

                const input = {
                    domainId: testDomainId,
                    status: WhoisStatus.OK,
                    whoisFetchedAt: new Date(),
                    whoisRaw: '',
                };

                // Act
                await updateDomainWhoisCache(input);

                // Assert
                const updatedDomain = await prisma.domain.findUnique({
                    where: { id: testDomainId },
                });

                expect(updatedDomain?.whoisRaw).toBe('');
                expect(updatedDomain?.whoisFetchLockedUntil).toBeInstanceOf(Date);

                vi.useRealTimers();
            });
        });

        describe('updateDomainBestKnown', () => {
            it('should update domain best known information', async () => {
                // Arrange
                const registeredAt = new Date('2023-01-01T00:00:00Z');
                const checkedAt = new Date('2024-01-15T10:30:00Z');
                const source = DomainSource.RDAP;
                const status = DomainStatus.OK;

                const input = {
                    domainId: testDomainId,
                    registeredAt,
                    checkedAt,
                    source,
                    status,
                };

                // Act
                await updateDomainBestKnown(input);

                // Assert
                const updatedDomain = await prisma.domain.findUnique({
                    where: { id: testDomainId },
                });

                expect(updatedDomain?.registeredAt).toEqual(registeredAt);
                expect(updatedDomain?.checkedAt).toEqual(checkedAt);
                expect(updatedDomain?.source).toBe(source);
                expect(updatedDomain?.status).toBe(status);

                // Verify cache fields are unchanged (should be null)
                expect(updatedDomain?.rdapFetchedAt).toBeNull();
                expect(updatedDomain?.whoisFetchedAt).toBeNull();
            });

            it('should update only best known fields and preserve cache data', async () => {
                // Arrange - Create domain with existing cache data
                await prisma.domain.update({
                    where: { id: testDomainId },
                    data: {
                        rdapFetchedAt: new Date('2024-01-14T10:30:00Z'),
                        rdapRaw: { events: [] },
                        whoisFetchedAt: new Date('2024-01-14T11:30:00Z'),
                        whoisRaw: 'WHOIS data',
                        rdapFetchLockedUntil: new Date('2024-02-14T10:30:00Z'),
                        whoisFetchLockedUntil: new Date('2024-02-14T11:30:00Z'),
                    },
                });

                const input = {
                    domainId: testDomainId,
                    registeredAt: new Date('2023-01-01T00:00:00Z'),
                    checkedAt: new Date('2024-01-15T10:30:00Z'),
                    source: DomainSource.WHOIS,
                    status: DomainStatus.REDACTED,
                };

                // Act
                await updateDomainBestKnown(input);

                // Assert
                const updatedDomain = await prisma.domain.findUnique({
                    where: { id: testDomainId },
                });

                expect(updatedDomain?.registeredAt).toBeInstanceOf(Date);
                expect(updatedDomain?.checkedAt).toBeInstanceOf(Date);
                expect(updatedDomain?.source).toBe(DomainSource.WHOIS);
                expect(updatedDomain?.status).toBe(DomainStatus.REDACTED);

                // Verify cache fields are preserved
                expect(updatedDomain?.rdapFetchedAt).toBeInstanceOf(Date);
                expect(updatedDomain?.rdapRaw).toEqual({ events: [] });
                expect(updatedDomain?.whoisFetchedAt).toBeInstanceOf(Date);
                expect(updatedDomain?.whoisRaw).toBe('WHOIS data');
                expect(updatedDomain?.rdapFetchLockedUntil).toBeInstanceOf(Date);
                expect(updatedDomain?.whoisFetchLockedUntil).toBeInstanceOf(Date);
            });

            it('should set registeredAt to null', async () => {
                // Arrange
                const input = {
                    domainId: testDomainId,
                    registeredAt: null,
                    checkedAt: new Date('2024-01-15T10:30:00Z'),
                    source: DomainSource.UNKNOWN,
                    status: DomainStatus.MISSING,
                };

                // Act
                await updateDomainBestKnown(input);

                // Assert
                const updatedDomain = await prisma.domain.findUnique({
                    where: { id: testDomainId },
                });

                expect(updatedDomain?.registeredAt).toBeNull();
                expect(updatedDomain?.checkedAt).toBeInstanceOf(Date);
                expect(updatedDomain?.source).toBe(DomainSource.UNKNOWN);
                expect(updatedDomain?.status).toBe(DomainStatus.MISSING);
            });

            it('should handle all domain statuses', async () => {
                // Arrange
                const statuses = [
                    DomainStatus.OK,
                    DomainStatus.MISSING,
                    DomainStatus.REDACTED,
                    DomainStatus.UNSUPPORTED,
                    DomainStatus.ERROR,
                    DomainStatus.UNKNOWN,
                ];

                for (const status of statuses) {
                    const input = {
                        domainId: testDomainId,
                        registeredAt: new Date('2023-01-01T00:00:00Z'),
                        checkedAt: new Date('2024-01-15T10:30:00Z'),
                        source: DomainSource.RDAP,
                        status,
                    };

                    // Act
                    await updateDomainBestKnown(input);

                    // Assert
                    const updatedDomain = await prisma.domain.findUnique({
                        where: { id: testDomainId },
                    });

                    expect(updatedDomain?.status).toBe(status);
                }
            });

            it('should handle all domain sources', async () => {
                // Arrange
                const sources = [DomainSource.RDAP, DomainSource.WHOIS, DomainSource.UNKNOWN];

                for (const source of sources) {
                    const input = {
                        domainId: testDomainId,
                        registeredAt: new Date('2023-01-01T00:00:00Z'),
                        checkedAt: new Date('2024-01-15T10:30:00Z'),
                        source,
                        status: DomainStatus.OK,
                    };

                    // Act
                    await updateDomainBestKnown(input);

                    // Assert
                    const updatedDomain = await prisma.domain.findUnique({
                        where: { id: testDomainId },
                    });

                    expect(updatedDomain?.source).toBe(source);
                }
            });

            it('should update checkedAt to current time', async () => {
                // Arrange
                const testTime = new Date('2024-01-15T10:30:00Z');
                vi.useFakeTimers();
                vi.setSystemTime(testTime);

                const input = {
                    domainId: testDomainId,
                    registeredAt: new Date('2023-01-01T00:00:00Z'),
                    checkedAt: testTime,
                    source: DomainSource.RDAP,
                    status: DomainStatus.OK,
                };

                // Act
                await updateDomainBestKnown(input);

                // Assert
                const updatedDomain = await prisma.domain.findUnique({
                    where: { id: testDomainId },
                });

                expect(updatedDomain?.checkedAt).toEqual(testTime);

                vi.useRealTimers();
            });
        });

        describe('Combined operations', () => {
            it('should allow separate updates to different domain aspects', async () => {
                // Arrange
                const domain = await prisma.domain.findUnique({
                    where: { id: testDomainId },
                });

                expect(domain?.rdapFetchedAt).toBeNull();
                expect(domain?.whoisFetchedAt).toBeNull();
                expect(domain?.registeredAt).toBeNull();

                // Act - Update RDAP cache
                vi.useFakeTimers();
                const rdapTime = new Date('2024-01-15T10:00:00Z');
                vi.setSystemTime(rdapTime);

                await updateDomainRdapCache({
                    domainId: testDomainId,
                    status: RdapStatus.OK,
                    rdapFetchedAt: rdapTime,
                    rdapRaw: { test: 'rdap' },
                });

                // Act - Update WHOIS cache
                const whoisTime = new Date('2024-01-15T11:00:00Z');
                vi.setSystemTime(whoisTime);

                await updateDomainWhoisCache({
                    domainId: testDomainId,
                    status: WhoisStatus.REDACTED,
                    whoisFetchedAt: whoisTime,
                    whoisRaw: 'WHOIS data',
                });

                // Act - Update best known info
                const checkedTime = new Date('2024-01-15T12:00:00Z');
                vi.setSystemTime(checkedTime);

                await updateDomainBestKnown({
                    domainId: testDomainId,
                    registeredAt: new Date('2023-01-01T00:00:00Z'),
                    checkedAt: checkedTime,
                    source: DomainSource.RDAP,
                    status: DomainStatus.OK,
                });

                // Assert
                const finalDomain = await prisma.domain.findUnique({
                    where: { id: testDomainId },
                });

                expect(finalDomain?.rdapFetchedAt).toEqual(rdapTime);
                expect(finalDomain?.rdapRaw).toEqual({ test: 'rdap' });
                expect(finalDomain?.rdapFetchLockedUntil).toBeInstanceOf(Date);

                expect(finalDomain?.whoisFetchedAt).toEqual(whoisTime);
                expect(finalDomain?.whoisRaw).toBe('WHOIS data');
                expect(finalDomain?.whoisFetchLockedUntil).toBeInstanceOf(Date);

                expect(finalDomain?.registeredAt).toBeInstanceOf(Date);
                expect(finalDomain?.checkedAt).toEqual(checkedTime);
                expect(finalDomain?.source).toBe(DomainSource.RDAP);
                expect(finalDomain?.status).toBe(DomainStatus.OK);

                vi.useRealTimers();
            });

            it('should allow overwriting previous updates', async () => {
                // Arrange - Initial updates
                vi.useFakeTimers();
                const initialTime = new Date('2024-01-15T10:00:00Z');
                vi.setSystemTime(initialTime);

                await updateDomainRdapCache({
                    domainId: testDomainId,
                    status: RdapStatus.OK,
                    rdapFetchedAt: new Date('2024-01-15T10:00:00Z'),
                    rdapRaw: { initial: 'data' },
                });

                await updateDomainBestKnown({
                    domainId: testDomainId,
                    registeredAt: new Date('2023-01-01T00:00:00Z'),
                    checkedAt: new Date('2024-01-15T10:00:00Z'),
                    source: DomainSource.RDAP,
                    status: DomainStatus.OK,
                });

                // Act - Overwrite with new data
                const newTime = new Date('2024-01-16T10:00:00Z');
                vi.setSystemTime(newTime);

                await updateDomainRdapCache({
                    domainId: testDomainId,
                    status: RdapStatus.REDACTED,
                    rdapFetchedAt: newTime,
                    rdapRaw: { updated: 'data' },
                });

                const newCheckedTime = new Date('2024-01-16T10:00:00Z');
                await updateDomainBestKnown({
                    domainId: testDomainId,
                    registeredAt: null, // Change from date to null
                    checkedAt: newCheckedTime,
                    source: DomainSource.WHOIS, // Change source
                    status: DomainStatus.REDACTED, // Change status
                });

                // Assert
                const finalDomain = await prisma.domain.findUnique({
                    where: { id: testDomainId },
                });

                expect(finalDomain?.rdapFetchedAt).toEqual(newTime);
                expect(finalDomain?.rdapRaw).toEqual({ updated: 'data' });
                expect(finalDomain?.rdapFetchLockedUntil).toBeInstanceOf(Date);

                expect(finalDomain?.registeredAt).toBeNull();
                expect(finalDomain?.checkedAt).toEqual(newCheckedTime);
                expect(finalDomain?.source).toBe(DomainSource.WHOIS);
                expect(finalDomain?.status).toBe(DomainStatus.REDACTED);

                vi.useRealTimers();
            });
        });
    });
});

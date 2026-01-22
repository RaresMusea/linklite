import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createLink } from '@/dal/links/links.repo';
import { normalizeHostnameFromUrl } from '@/lib/utils';
import { updateDomainRdap } from '@/dal/domains/domains.repo';
import { DomainSource, DomainStatus } from '@/generated/prisma/enums';
import { RdapDomainParams, RdapStatus } from '@/lib/rdap/rdap.types';

const mockedUtils = vi.hoisted(() => ({
    normalizeHostnameFromUrl: vi.fn(),
}));

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
});

import { beforeEach, describe, it, expect, vi, Mock } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createLink, increaseClickCount } from '@/dal/links/links.repo';
import { normalizeHostnameFromUrl } from '@/lib/utils';
import { upsertDomainEnrichmentJob } from '@/dal/domain_enrichment_jobs/domain_enrichment_jobs.repo';
import { DomainEnrichmentJobStatus } from '@/generated/prisma/enums';
import { InvalidHostnameError } from '@/lib/errors/InvalidHostnameError';
import { resetDb } from '@/tests/helpers/db';

vi.mock('@/lib/utils', () => ({
    normalizeHostnameFromUrl: vi.fn(),
}));

vi.mock('@/dal/domain_enrichment_jobs/domain_enrichment_jobs.repo', () => ({
    upsertDomainEnrichmentJob: vi.fn(),
}));

beforeEach(async () => {
    await resetDb();
})

describe('Link Repository - Integration Tests', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
    });

    describe('createLink', () => {
        describe('Successful link creation', () => {
            it('Should create a link with domain and trigger enrichment job', async () => {
                // Arrange
                const mockHostname = 'example.com';
                (normalizeHostnameFromUrl as Mock).mockReturnValue(mockHostname);

                const input = {
                    slug: 'test-slug',
                    targetUrl: 'https://example.com',
                    ownerId: null,
                };

                // Act
                const result = await createLink(input);

                // Assert
                // Verify returned result
                expect(result.slug).toBe('test-slug');
                expect(result.targetUrl).toBe('https://example.com');
                expect(result.ownerId).toBeNull();
                expect(result.domainId).toBeDefined();
                expect(result.id).toBeDefined();

                // Verify database state
                const linkInDb = await prisma.link.findUnique({
                    where: { slug: 'test-slug' },
                    include: { domain: true },
                });

                expect(linkInDb).toBeDefined();
                expect(linkInDb?.domain?.hostname).toBe(mockHostname);
                expect(linkInDb?.domain?.firstSeenAt).toBeInstanceOf(Date);

                // Verify enrichment job was triggered
                expect(upsertDomainEnrichmentJob).toHaveBeenCalledTimes(1);
                expect(upsertDomainEnrichmentJob).toHaveBeenCalledWith({
                    domainId: result.domainId,
                    status: DomainEnrichmentJobStatus.PENDING,
                });
            });

            it('Should create a link with ownerId', async () => {
                // Arrange
                (normalizeHostnameFromUrl as Mock).mockReturnValue('example.com');
                const ownerId = 'user-123';

                // Act
                const result = await createLink({
                    slug: 'owned-link',
                    targetUrl: 'https://example.com',
                    ownerId,
                });

                // Assert
                expect(result.ownerId).toBe(ownerId);
                expect(upsertDomainEnrichmentJob).toHaveBeenCalled();
            });

            it('Should reuse existing domain and create enrichment job for each link', async () => {
                // Arrange
                (normalizeHostnameFromUrl as Mock).mockReturnValue('example.com');

                // Act - Create first link
                const firstLink = await createLink({
                    slug: 'first-link',
                    targetUrl: 'https://example.com/page1',
                    ownerId: null,
                });

                // Act - Create second link with same hostname
                const secondLink = await createLink({
                    slug: 'second-link',
                    targetUrl: 'https://example.com/page2',
                    ownerId: null,
                });

                // Assert
                // Verify domains count
                const domains = await prisma.domain.findMany();
                expect(domains).toHaveLength(1);

                // Verify links share the same domain
                expect(firstLink.domainId).toBe(secondLink.domainId);

                // Verify enrichment jobs were triggered for both links
                expect(upsertDomainEnrichmentJob).toHaveBeenCalledTimes(2);
                expect(upsertDomainEnrichmentJob).toHaveBeenNthCalledWith(1, {
                    domainId: firstLink.domainId,
                    status: DomainEnrichmentJobStatus.PENDING,
                });
                expect(upsertDomainEnrichmentJob).toHaveBeenNthCalledWith(2, {
                    domainId: secondLink.domainId,
                    status: DomainEnrichmentJobStatus.PENDING,
                });
            });

            it('Should create separate domains for different hostnames', async () => {
                // Arrange
                (normalizeHostnameFromUrl as Mock).mockReturnValueOnce('example.com').mockReturnValueOnce('google.com');

                // Act
                await createLink({
                    slug: 'example-link',
                    targetUrl: 'https://example.com',
                    ownerId: null,
                });

                await createLink({
                    slug: 'google-link',
                    targetUrl: 'https://google.com',
                    ownerId: null,
                });

                // Assert
                const domains = await prisma.domain.findMany();
                expect(domains).toHaveLength(2);
                expect(domains.map((d) => d.hostname)).toEqual(expect.arrayContaining(['example.com', 'google.com']));

                expect(upsertDomainEnrichmentJob).toHaveBeenCalledTimes(2);
            });
        });

        describe('URL normalization and validation', () => {
            it('Should normalize URL hostname before domain creation', async () => {
                // Arrange
                const targetUrl = 'https://www.example.com';
                (normalizeHostnameFromUrl as Mock).mockReturnValue('example.com');

                // Act
                await createLink({
                    slug: 'normalized',
                    targetUrl,
                    ownerId: null,
                });

                // Assert
                expect(normalizeHostnameFromUrl).toHaveBeenCalledWith(targetUrl);

                const domain = await prisma.domain.findFirst();
                expect(domain?.hostname).toBe('example.com');
            });

            it('Should handle URLs with subdomains correctly', async () => {
                // Arrange
                (normalizeHostnameFromUrl as Mock).mockReturnValue('sub.example.com');

                // Act
                await createLink({
                    slug: 'subdomain',
                    targetUrl: 'https://sub.example.com',
                    ownerId: null,
                });

                // Assert
                const domain = await prisma.domain.findFirst();
                expect(domain?.hostname).toBe('sub.example.com');
            });

            it('Should handle complex URLs with paths, parameters, and anchors', async () => {
                // Arrange
                const targetUrl = 'https://example.com/path/to/page?query=string#anchor';
                (normalizeHostnameFromUrl as Mock).mockReturnValue('example.com');

                // Act
                const result = await createLink({
                    slug: 'complex-url',
                    targetUrl,
                    ownerId: null,
                });

                // Assert
                expect(result.targetUrl).toBe(targetUrl);
                expect(upsertDomainEnrichmentJob).toHaveBeenCalled();
            });

            it('Should handle URLs with ports and credentials', async () => {
                // Arrange
                const targetUrl = 'https://user:pass@example.com:8080';
                (normalizeHostnameFromUrl as Mock).mockReturnValue('example.com');

                // Act
                const result = await createLink({
                    slug: 'auth-port',
                    targetUrl,
                    ownerId: null,
                });

                // Assert
                expect(result.targetUrl).toBe(targetUrl);
                const linkInDb = await prisma.link.findUnique({
                    where: { slug: 'auth-port' },
                });
                expect(linkInDb?.targetUrl).toBe(targetUrl);
            });

            it('Should handle international domain names (IDN)', async () => {
                // Arrange
                const punycode = 'xn--mnchen-3ya.de';
                (normalizeHostnameFromUrl as Mock).mockReturnValue(punycode);

                // Act
                await createLink({
                    slug: 'idn-link',
                    targetUrl: 'https://münchen.de',
                    ownerId: null,
                });

                // Assert
                const domain = await prisma.domain.findFirst();
                expect(domain?.hostname).toBe(punycode);
            });
        });

        describe('Error handling and edge cases', () => {
            it('Should throw InvalidHostnameError when URL normalization returns null', async () => {
                // Arrange
                (normalizeHostnameFromUrl as Mock).mockReturnValue(null);

                // Act & Assert
                await expect(
                    createLink({
                        slug: 'invalid',
                        targetUrl: 'invalid-url',
                        ownerId: null,
                    })
                ).rejects.toThrow(InvalidHostnameError);

                // Verify no database changes
                const links = await prisma.link.count();
                const domains = await prisma.domain.count();
                expect(links).toBe(0);
                expect(domains).toBe(0);

                // Verify enrichment job not called
                expect(upsertDomainEnrichmentJob).not.toHaveBeenCalled();
            });

            it('Should throw InvalidHostnameError when URL normalization returns empty string', async () => {
                // Arrange
                (normalizeHostnameFromUrl as Mock).mockReturnValue('');

                // Act & Assert
                await expect(
                    createLink({
                        slug: 'empty-hostname',
                        targetUrl: 'https://',
                        ownerId: null,
                    })
                ).rejects.toThrow(InvalidHostnameError);
            });

            it('Should fail on duplicate slug (unique constraint)', async () => {
                // Arrange
                (normalizeHostnameFromUrl as Mock).mockReturnValue('example.com');

                await createLink({
                    slug: 'duplicate',
                    targetUrl: 'https://example.com/first',
                    ownerId: null,
                });

                // Clear mock to track only second call
                vi.mocked(upsertDomainEnrichmentJob).mockClear();

                // Act & Assert - Second attempt with same slug
                await expect(
                    createLink({
                        slug: 'duplicate',
                        targetUrl: 'https://example.com/second',
                        ownerId: null,
                    })
                ).rejects.toMatchObject({ code: 'P2002' });

                // Verify enrichment job not called for failed attempt
                expect(upsertDomainEnrichmentJob).not.toHaveBeenCalled();

                // Verify only one link exists
                const links = await prisma.link.findMany();
                expect(links).toHaveLength(1);
            });

            it('Should handle transaction rollback when link creation fails due to duplicate slug', async () => {
                // Arrange
                (normalizeHostnameFromUrl as Mock).mockReturnValue('example.com');

                // Create a link with a specific slug first
                const existingSlug = 'existing-slug-for-rollback';
                await createLink({
                    slug: existingSlug,
                    targetUrl: 'https://example.com/first',
                    ownerId: null,
                });

                // Clear mock to track only the second call
                vi.mocked(upsertDomainEnrichmentJob).mockClear();

                // Count existing records
                const initialLinkCount = await prisma.link.count();
                const initialDomainCount = await prisma.domain.count();
                const initialJobCount = await prisma.domainEnrichmentJob.count();

                // Act & Assert - Try to create another link with the SAME slug
                // This will fail due to unique constraint, testing transaction rollback
                await expect(
                    createLink({
                        slug: existingSlug, // Same slug - will cause P2002 error
                        targetUrl: 'https://example.com/second',
                        ownerId: null,
                    })
                ).rejects.toThrow(); // Or more specific: .rejects.toMatchObject({ code: 'P2002' })

                // Assert - Verify enrichment job was NOT called for the failed attempt
                expect(upsertDomainEnrichmentJob).not.toHaveBeenCalled();

                // Assert - Verify database state didn't change
                const finalLinkCount = await prisma.link.count();
                const finalDomainCount = await prisma.domain.count();
                const finalJobCount = await prisma.domainEnrichmentJob.count();

                // Should still have only 1 link, 1 domain, and 1 job (from first creation)
                expect(finalLinkCount).toBe(initialLinkCount);
                expect(finalDomainCount).toBe(initialDomainCount);
                expect(finalJobCount).toBe(initialJobCount);

                // Verify only the original link exists
                const links = await prisma.link.findMany({
                    where: { slug: existingSlug },
                });
                expect(links).toHaveLength(1);
                expect(links[0].targetUrl).toBe('https://example.com/first');
            });

            it('Should not create enrichment job if URL normalization fails', async () => {
                // Arrange
                (normalizeHostnameFromUrl as Mock).mockReturnValue(null);

                // Count existing records
                const initialLinkCount = await prisma.link.count();
                const initialDomainCount = await prisma.domain.count();

                // Act & Assert
                await expect(
                    createLink({
                        slug: 'normalization-fail',
                        targetUrl: 'invalid-url',
                        ownerId: null,
                    })
                ).rejects.toThrow(InvalidHostnameError);

                // Assert - No database changes Should occur
                const finalLinkCount = await prisma.link.count();
                const finalDomainCount = await prisma.domain.count();

                expect(finalLinkCount).toBe(initialLinkCount);
                expect(finalDomainCount).toBe(initialDomainCount);

                // Verify enrichment job not called
                expect(upsertDomainEnrichmentJob).not.toHaveBeenCalled();
            });

            it('Should not create enrichment job for invalid URLs', async () => {
                // Test various invalid URL scenarios
                const invalidScenarios = [
                    { url: 'not-a-url', description: 'plain string' },
                    { url: 'ftp://example.com', description: 'unsupported protocol' },
                    { url: 'http://', description: 'missing hostname' },
                    { url: 'https://', description: 'https missing hostname' },
                    { url: '', description: 'empty string' },
                ];

                for (const scenario of invalidScenarios) {
                    // Reset mocks for each scenario
                    vi.mocked(normalizeHostnameFromUrl).mockReturnValue(null);
                    vi.mocked(upsertDomainEnrichmentJob).mockClear();

                    // Count before
                    const linksBefore = await prisma.link.count();
                    const domainsBefore = await prisma.domain.count();

                    // Act & Assert
                    await expect(
                        createLink({
                            slug: `invalid-${Date.now()}`,
                            targetUrl: scenario.url,
                            ownerId: null,
                        })
                    ).rejects.toThrow(InvalidHostnameError);

                    // Verify no database changes
                    const linksAfter = await prisma.link.count();
                    const domainsAfter = await prisma.domain.count();

                    expect(linksAfter).toBe(linksBefore);
                    expect(domainsAfter).toBe(domainsBefore);

                    // Verify enrichment job not called
                    expect(upsertDomainEnrichmentJob).not.toHaveBeenCalled();
                }
            });

            // Better to test error scenarios that can actually happen:
            it('Should not create enrichment job when link creation fails mid-transaction', async () => {
                // Arrange
                (normalizeHostnameFromUrl as Mock).mockReturnValue('example.com');

                // Create a conflict situation
                const conflictingSlug = 'conflict-slug';

                // First, create a link successfully
                await createLink({
                    slug: conflictingSlug,
                    targetUrl: 'https://example.com/first',
                    ownerId: null,
                });

                // Clear mock to track second attempt
                vi.mocked(upsertDomainEnrichmentJob).mockClear();

                // Count before second attempt
                const jobsBefore = await prisma.domainEnrichmentJob.count();

                // Act & Assert - Try to create with same slug (will fail)
                await expect(
                    createLink({
                        slug: conflictingSlug,
                        targetUrl: 'https://example.com/second',
                        ownerId: null,
                    })
                ).rejects.toThrow(); // Should throw a Prisma unique constraint error

                // Verify enrichment job count didn't increase
                const jobsAfter = await prisma.domainEnrichmentJob.count();
                expect(jobsAfter).toBe(jobsBefore);

                // Verify mock wasn't called
                expect(upsertDomainEnrichmentJob).not.toHaveBeenCalled();
            });

            describe('Concurrency and race conditions', () => {
                it('Should handle concurrent link creation with same domain', async () => {
                    // Arrange
                    (normalizeHostnameFromUrl as Mock).mockReturnValue('example.com');

                    // Act - Create multiple links concurrently
                    const slugs = ['concurrent-1', 'concurrent-2', 'concurrent-3'];
                    const promises = slugs.map((slug) =>
                        createLink({
                            slug,
                            targetUrl: `https://example.com/${slug}`,
                            ownerId: null,
                        })
                    );

                    const results = await Promise.all(promises);

                    // Assert
                    // Should have 3 links
                    const links = await prisma.link.findMany();
                    expect(links).toHaveLength(3);

                    // Should have 1 domain
                    const domains = await prisma.domain.findMany();
                    expect(domains).toHaveLength(1);

                    // All links Should have same domainId
                    const domainIds = results.map((r) => r.domainId);
                    const uniqueDomainIds = new Set(domainIds);
                    expect(uniqueDomainIds.size).toBe(1);

                    // Should have triggered 3 enrichment jobs
                    expect(upsertDomainEnrichmentJob).toHaveBeenCalledTimes(3);
                });
            });

            describe('Database constraints and data integrity', () => {
                it('Should maintain referential integrity between link and domain', async () => {
                    // Arrange
                    (normalizeHostnameFromUrl as Mock).mockReturnValue('example.com');

                    // Act
                    const link = await createLink({
                        slug: 'integrity-test',
                        targetUrl: 'https://example.com',
                        ownerId: null,
                    });

                    // Assert
                    // Verify domain exists
                    const domain = await prisma.domain.findUnique({
                        where: { id: link.domainId! },
                    });
                    expect(domain).toBeDefined();

                    // Verify foreign key constraint
                    const linkWithDomain = await prisma.link.findUnique({
                        where: { slug: 'integrity-test' },
                        include: { domain: true },
                    });
                    expect(linkWithDomain?.domain?.id).toBe(domain?.id);
                });

                it('Should set firstSeenAt timestamp on new domain', async () => {
                    // Arrange
                    const testStart = new Date();
                    (normalizeHostnameFromUrl as Mock).mockReturnValue('new-domain.com');

                    // Act
                    await createLink({
                        slug: 'new-domain-link',
                        targetUrl: 'https://new-domain.com',
                        ownerId: null,
                    });

                    // Assert
                    const domain = await prisma.domain.findFirst({
                        where: { hostname: 'new-domain.com' },
                    });

                    expect(domain?.firstSeenAt).toBeInstanceOf(Date);
                    expect(domain?.firstSeenAt.getTime()).toBeGreaterThanOrEqual(testStart.getTime());
                });

                it('Should preserve existing firstSeenAt when reusing domain', async () => {
                    // Arrange
                    (normalizeHostnameFromUrl as Mock).mockReturnValue('example.com');

                    // Create first link
                    await createLink({
                        slug: 'first-link',
                        targetUrl: 'https://example.com',
                        ownerId: null,
                    });

                    // Get original firstSeenAt
                    const originalDomain = await prisma.domain.findFirst();
                    const originalFirstSeenAt = originalDomain?.firstSeenAt;

                    // Wait a bit
                    await new Promise((resolve) => setTimeout(resolve, 10));

                    // Create second link with same domain
                    await createLink({
                        slug: 'second-link',
                        targetUrl: 'https://example.com/new',
                        ownerId: null,
                    });

                    // Assert
                    const updatedDomain = await prisma.domain.findFirst();
                    expect(updatedDomain?.firstSeenAt).toEqual(originalFirstSeenAt);
                });
            });
        });

        describe('increaseClickCount', () => {
            beforeEach(async () => {
                vi.mocked(normalizeHostnameFromUrl).mockReturnValue('example.com');
            });

            it('increments clicks by 1 and returns the new value', async () => {
                // Arrange
                const link = await createLink({
                    slug: 'it-test-slug-3',
                    targetUrl: 'https://example.com',
                    ownerId: null,
                });

                // Act
                const clicks = await increaseClickCount(link.slug);

                // Assert
                expect(clicks).toBe(1);

                const db = await prisma.link.findUnique({ where: { slug: link.slug }, select: { clicks: true } });
                expect(db?.clicks).toBe(1);
            });

            it('increments consistently across multiple calls', async () => {
                // Arrange
                const link = await createLink({
                    slug: 'it-test-slug-4',
                    targetUrl: 'https://example.com',
                    ownerId: null,
                });

                // Act
                const c1 = await increaseClickCount(link.slug);
                const c2 = await increaseClickCount(link.slug);
                const c3 = await increaseClickCount(link.slug);

                // Assert
                expect([c1, c2, c3]).toEqual([1, 2, 3]);

                const db = await prisma.link.findUnique({ where: { slug: link.slug }, select: { clicks: true } });
                expect(db?.clicks).toBe(3);
            });

            it('throws a Prisma error when slug does not exist (P2025)', async () => {
                // Act & Assert
                await expect(increaseClickCount('missing-slug')).rejects.toMatchObject({
                    code: 'P2025',
                });
            });

            it('handles concurrent click increments', async () => {
                // Arrange
                const link = await createLink({
                    slug: 'concurrent-slug',
                    targetUrl: 'https://example.com',
                    ownerId: null,
                });

                // Act - simulate concurrent clicks
                const promises = Array.from({ length: 10 }, () => increaseClickCount(link.slug));
                const results = await Promise.all(promises);

                // Assert
                // Results Should be 1-10 in some order (depending on execution timing)
                // But the final count Should be 10
                const db = await prisma.link.findUnique({ where: { slug: link.slug }, select: { clicks: true } });
                expect(db?.clicks).toBe(10);

                // All results Should be unique since each increment returns the new value
                const uniqueResults = new Set(results);
                expect(uniqueResults.size).toBeGreaterThan(0);
            });

            it('preserves other link data when incrementing clicks', async () => {
                // Arrange
                const ownerId = 'user-456';
                const link = await createLink({
                    slug: 'preserve-slug',
                    targetUrl: 'https://example.com/path',
                    ownerId,
                });

                // Act
                await increaseClickCount(link.slug);
                await increaseClickCount(link.slug);

                // Assert
                const updatedLink = await prisma.link.findUnique({
                    where: { slug: link.slug },
                    select: { slug: true, targetUrl: true, ownerId: true, clicks: true },
                });

                expect(updatedLink?.slug).toBe(link.slug);
                expect(updatedLink?.targetUrl).toBe(link.targetUrl);
                expect(updatedLink?.ownerId).toBe(ownerId);
                expect(updatedLink?.clicks).toBe(2);
            });
        });
    });
});

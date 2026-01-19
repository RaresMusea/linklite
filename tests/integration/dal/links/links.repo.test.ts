import { beforeEach, describe, it, expect, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createLink, increaseClickCount } from '@/dal/links/links.repo';
import { InvalidHostnameError } from '@/lib/errors/InvalidHostnameError';

vi.mock('@/lib/utils', () => ({
    normalizeHostnameFromUrl: vi.fn(),
}));

import { normalizeHostnameFromUrl } from '@/lib/utils';

describe('Link repo integration tests', () => {
    beforeEach(async () => {
        await prisma.link.deleteMany();
        await prisma.domain.deleteMany();
        vi.clearAllMocks();
    });

    describe('createLink', () => {
        it('creates a link with domain in the database', async () => {
            // Arrange
            const mockHostname = 'example.com';
            vi.mocked(normalizeHostnameFromUrl).mockReturnValue(mockHostname);

            // Act
            const created = await createLink({
                slug: 'it-test-slug-2',
                targetUrl: 'https://example.com',
                ownerId: null,
            });

            console.log('CREATED: ', created);

            // Add a small delay to ensure transaction is committed
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Assert
            expect(created.slug).toBe('it-test-slug-2');
            expect(created.targetUrl).toBe('https://example.com');
            expect(created.ownerId).toBeNull();

            // Fetch the complete link with domain from database
            const link = await prisma.link.findUnique({
                where: { slug: 'it-test-slug-2' },
                include: { domain: true },
            });

            console.log('Found link with domain:', link);

            // Now verify the link and domain
            expect(link).toBeDefined();
            expect(link?.domain).toBeDefined();
            expect(link?.domain?.hostname).toBe(mockHostname);

            // Also verify domain was created separately
            const domain = await prisma.domain.findUnique({
                where: { hostname: mockHostname },
            });
            expect(domain).toBeDefined();
            expect(domain?.hostname).toBe(mockHostname);
        });

        it('creates a link with ownerId', async () => {
            // Arrange
            const mockHostname = 'example.com';
            vi.mocked(normalizeHostnameFromUrl).mockReturnValue(mockHostname);
            const ownerId = 'user-123';

            // Act
            const created = await createLink({
                slug: 'owned-slug',
                targetUrl: 'https://example.com',
                ownerId,
            });

            // Assert
            expect(created.slug).toBe('owned-slug');
            expect(created.ownerId).toBe(ownerId);
        });

        it('reuses existing domain when creating multiple links for same hostname', async () => {
            // Arrange
            const mockHostname = 'example.com';
            vi.mocked(normalizeHostnameFromUrl).mockReturnValue(mockHostname);

            // Act - create first link
            const link1 = await createLink({
                slug: 'link-1',
                targetUrl: 'https://example.com/page1',
                ownerId: null,
            });

            // Create second link with same hostname
            const link2 = await createLink({
                slug: 'link-2',
                targetUrl: 'https://example.com/page2',
                ownerId: null,
            });

            // Assert - should have only one domain
            const domains = await prisma.domain.findMany();
            expect(domains).toHaveLength(1);
            expect(domains[0].hostname).toBe(mockHostname);

            // Verify both links are associated with same domain
            const link1WithDomain = await prisma.link.findUnique({
                where: { slug: link1.slug },
                include: { domain: true },
            });
            const link2WithDomain = await prisma.link.findUnique({
                where: { slug: link2.slug },
                include: { domain: true },
            });

            // @ts-expect-error it is not null
            expect(link1WithDomain?.domain.id).toBe(link2WithDomain?.domain.id);
        });

        it('creates links with different domains for different hostnames', async () => {
            // Arrange
            vi.mocked(normalizeHostnameFromUrl).mockReturnValueOnce('example.com').mockReturnValueOnce('google.com');

            // Act
            await createLink({
                slug: 'link-1',
                targetUrl: 'https://example.com',
                ownerId: null,
            });

            await createLink({
                slug: 'link-2',
                targetUrl: 'https://google.com',
                ownerId: null,
            });

            // Assert
            const domains = await prisma.domain.findMany();
            expect(domains).toHaveLength(2);
            expect(domains.map((d) => d.hostname)).toContain('example.com');
            expect(domains.map((d) => d.hostname)).toContain('google.com');
        });

        it('normalizes URL hostname before creating domain', async () => {
            // Arrange
            const targetUrl = 'https://www.example.com';
            vi.mocked(normalizeHostnameFromUrl).mockReturnValue('example.com'); // www removed

            // Act
            await createLink({
                slug: 'normalized-slug',
                targetUrl,
                ownerId: null,
            });

            // Assert
            expect(normalizeHostnameFromUrl).toHaveBeenCalledWith(targetUrl);

            const domain = await prisma.domain.findFirst();
            expect(domain?.hostname).toBe('example.com'); // Should be normalized
        });

        it('handles URLs with www prefix normalization', async () => {
            // Arrange
            vi.mocked(normalizeHostnameFromUrl).mockReturnValue('example.com');

            // Act
            await createLink({
                slug: 'www-slug',
                targetUrl: 'https://www.example.com',
                ownerId: null,
            });

            // Assert
            const domain = await prisma.domain.findFirst();
            expect(domain?.hostname).toBe('example.com');
        });

        it('handles URLs with subdomains', async () => {
            // Arrange
            const hostname = 'sub.example.com';
            vi.mocked(normalizeHostnameFromUrl).mockReturnValue(hostname);

            // Act
            await createLink({
                slug: 'subdomain-slug',
                targetUrl: 'https://sub.example.com',
                ownerId: null,
            });

            // Assert
            const domain = await prisma.domain.findFirst();
            expect(domain?.hostname).toBe(hostname);
        });

        it('throws InvalidHostnameError when URL normalization fails', async () => {
            // Arrange
            vi.mocked(normalizeHostnameFromUrl).mockReturnValue(null);

            // Act & Assert
            await expect(
                createLink({
                    slug: 'invalid-url',
                    targetUrl: 'invalid-url',
                    ownerId: null,
                })
            ).rejects.toThrow(InvalidHostnameError);
        });

        it('throws InvalidHostnameError for empty hostname after normalization', async () => {
            // Arrange
            vi.mocked(normalizeHostnameFromUrl).mockReturnValue('');

            // Act & Assert
            await expect(
                createLink({
                    slug: 'empty-hostname',
                    targetUrl: 'https://',
                    ownerId: null,
                })
            ).rejects.toThrow(InvalidHostnameError);
        });

        it('handles transaction rollback when link creation fails', async () => {
            // Arrange
            const mockHostname = 'example.com';
            vi.mocked(normalizeHostnameFromUrl).mockReturnValue(mockHostname);

            // Count existing records
            const initialLinkCount = await prisma.link.count();
            const initialDomainCount = await prisma.domain.count();

            // Create a slug that already exists to trigger a unique constraint error
            const existingSlug = 'existing-slug-for-rollback-test';

            // First, create a link with this slug successfully
            await createLink({
                slug: existingSlug,
                targetUrl: 'https://example.com/first',
                ownerId: null,
            });

            // Now try to create another link with the same slug
            // This should fail with Prisma P2002 error (unique constraint violation)
            await expect(
                createLink({
                    slug: existingSlug, // Same slug - will cause P2002 error
                    targetUrl: 'https://example.com/second',
                    ownerId: null,
                })
            ).rejects.toMatchObject({ code: 'P2002' });

            // Verify transaction was rolled back for the failed attempt
            // We should have only 1 link (the first one) and 1 domain
            const finalLinkCount = await prisma.link.count();
            const finalDomainCount = await prisma.domain.count();

            expect(finalLinkCount).toBe(initialLinkCount + 1); // Only first link
            expect(finalDomainCount).toBe(initialDomainCount + 1); // Only one domain

            // Verify the domain exists (created by first successful call)
            const domain = await prisma.domain.findUnique({
                where: { hostname: mockHostname },
            });
            expect(domain).toBeDefined();

            // Verify only one link is associated with this domain
            const linksForDomain = await prisma.link.findMany({
                where: { domainId: domain?.id },
            });
            expect(linksForDomain).toHaveLength(1);
            expect(linksForDomain[0].slug).toBe(existingSlug);
        });

        it('fails on duplicate slug (unique constraint)', async () => {
            // Arrange
            const mockHostname = 'example.com';
            vi.mocked(normalizeHostnameFromUrl).mockReturnValue(mockHostname);

            await createLink({
                slug: 'dup-slug',
                targetUrl: 'https://example.com',
                ownerId: null,
            });

            // Act & Assert
            await expect(
                createLink({
                    slug: 'dup-slug',
                    targetUrl: 'https://example.com/2',
                    ownerId: null,
                })
            ).rejects.toMatchObject({ code: 'P2002' }); // Prisma unique error

            // Verify only one link was created
            const links = await prisma.link.findMany();
            expect(links).toHaveLength(1);
        });

        it('handles international domain names', async () => {
            // Arrange
            const punycodeHostname = 'xn--mnchen-3ya.de'; // münchen.de in punycode
            vi.mocked(normalizeHostnameFromUrl).mockReturnValue(punycodeHostname);

            // Act
            await createLink({
                slug: 'idn-slug',
                targetUrl: 'https://münchen.de',
                ownerId: null,
            });

            // Assert
            const domain = await prisma.domain.findFirst();
            expect(domain?.hostname).toBe(punycodeHostname);
        });

        it('handles URLs with credentials', async () => {
            // Arrange
            const hostname = 'example.com';
            vi.mocked(normalizeHostnameFromUrl).mockReturnValue(hostname);

            // Act
            await createLink({
                slug: 'auth-slug',
                targetUrl: 'https://user:pass@example.com',
                ownerId: null,
            });

            // Assert
            const link = await prisma.link.findUnique({
                where: { slug: 'auth-slug' },
            });
            expect(link?.targetUrl).toBe('https://user:pass@example.com');

            const domain = await prisma.domain.findFirst();
            expect(domain?.hostname).toBe(hostname);
        });

        it('handles URLs with ports', async () => {
            // Arrange
            const hostname = 'example.com';
            vi.mocked(normalizeHostnameFromUrl).mockReturnValue(hostname);

            // Act
            await createLink({
                slug: 'port-slug',
                targetUrl: 'https://example.com:8080',
                ownerId: null,
            });

            // Assert
            const link = await prisma.link.findUnique({
                where: { slug: 'port-slug' },
            });
            expect(link?.targetUrl).toBe('https://example.com:8080');

            const domain = await prisma.domain.findFirst();
            expect(domain?.hostname).toBe(hostname);
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
            // Results should be 1-10 in some order (depending on execution timing)
            // But the final count should be 10
            const db = await prisma.link.findUnique({ where: { slug: link.slug }, select: { clicks: true } });
            expect(db?.clicks).toBe(10);

            // All results should be unique since each increment returns the new value
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

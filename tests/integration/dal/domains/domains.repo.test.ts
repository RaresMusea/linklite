import { beforeEach, afterAll, beforeAll, describe, it, expect, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createLink } from '@/dal/links/links.repo';

const mockedUtils = vi.hoisted(() => ({
    normalizeHostnameFromUrl: vi.fn(),
}));

vi.mock('@/lib/utils', () => mockedUtils);

import { normalizeHostnameFromUrl } from '@/lib/utils';

describe('Domain repo integration tests', () => {
    beforeAll(async () => {
        await prisma.$connect();
    });

    beforeEach(async () => {
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
        expect(domain?.whoisCreatedAt).toBeNull();
        expect(domain?.whoisCheckedAt).toBeNull();
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

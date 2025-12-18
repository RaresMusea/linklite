import { beforeEach, afterAll, describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createLink } from '@/dal/links/links.repo';

describe('links.repo (integration)', () => {
    beforeEach(async () => {
        await prisma.link.deleteMany();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('creates a link in the database', async () => {
        const created = await createLink({
            slug: 'it-test-slug',
            targetUrl: 'https://example.com',
            ownerId: null,
        });

        expect(created.slug).toBe('it-test-slug');
    });

    it('fails on duplicate slug (unique constraint)', async () => {
        await createLink({
            slug: 'dup-slug',
            targetUrl: 'https://example.com',
            ownerId: null,
        });

        await expect(
            createLink({
                slug: 'dup-slug',
                targetUrl: 'https://example.com/2',
                ownerId: null,
            })
        ).rejects.toMatchObject({ code: 'P2002' }); // Prisma unique error
    });
});
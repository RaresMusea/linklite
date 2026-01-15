import { beforeEach, afterAll, beforeAll, describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createLink, increaseClickCount } from '@/dal/links/links.repo';

describe('links.repo (integration)', () => {
    beforeEach(async () => {
        await prisma.link.deleteMany();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('creates a link in the database', async () => {
        const created = await createLink({
            slug: 'it-test-slug-2',
            targetUrl: 'https://example.com',
            ownerId: null,
        });

        expect(created.slug).toBe('it-test-slug-2');
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

describe('increaseClickCount (integration)', () => {
    beforeAll(async () => {
        await prisma.$connect();
    });

    beforeEach(async () => {
        await prisma.link.deleteMany();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('increments clicks by 1 and returns the new value', async () => {
        const link = await createLink({
            slug: 'it-test-slug-3',
            targetUrl: 'https://example.com',
            ownerId: null,
        });

        const clicks = await increaseClickCount(link.slug);

        expect(clicks).toBe(1);

        const db = await prisma.link.findUnique({ where: { slug: link.slug }, select: { clicks: true } });
        expect(db?.clicks).toBe(1);
    });

    it('increments consistently across multiple calls', async () => {
        const link = await createLink({
            slug: 'it-test-slug-4',
            targetUrl: 'https://example.com',
            ownerId: null,
        });

        const c1 = await increaseClickCount(link.slug);
        const c2 = await increaseClickCount(link.slug);
        const c3 = await increaseClickCount(link.slug);

        expect([c1, c2, c3]).toEqual([1, 2, 3]);

        const db = await prisma.link.findUnique({ where: { slug: link.slug }, select: { clicks: true } });
        expect(db?.clicks).toBe(3);
    });

    it('throws a Prisma error when slug does not exist (P2025)', async () => {
        await expect(increaseClickCount('missing-slug')).rejects.toMatchObject({
            code: 'P2025',
        });
    });
});

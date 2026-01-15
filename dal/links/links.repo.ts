import { CreatedLink, CreateLinkInput } from '@/dal/links/links.types';
import { prisma } from '@/lib/prisma';

export async function createLink(input: CreateLinkInput): Promise<CreatedLink> {
    return prisma.link.create({
        data: {
            slug: input.slug,
            targetUrl: input.targetUrl,
            ownerId: input.ownerId,
        },
        select: {
            id: true,
            slug: true,
            targetUrl: true,
            ownerId: true,
        },
    });
}

export async function increaseClickCount(slug: string): Promise<number> {
    const result: { clicks: number } = await prisma.link.update({
        where: {
            slug: slug,
        },
        data: {
            clicks: {
                increment: 1,
            },
        },
        select: {
            clicks: true,
        },
    });

    return result.clicks;
}

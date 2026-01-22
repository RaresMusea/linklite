import { CreatedLink, CreateLinkInput } from '@/dal/links/links.types';
import { prisma } from '@/lib/prisma';
import { normalizeHostnameFromUrl } from '@/lib/utils';
import { InvalidHostnameError } from '@/lib/errors/InvalidHostnameError';
import { upsertDomain } from '@/dal/domains/domains.repo';

export async function createLink(input: CreateLinkInput): Promise<CreatedLink> {
    const hostname = normalizeHostnameFromUrl(input.targetUrl);

    if (!hostname) {
        throw new InvalidHostnameError();
    }

    return prisma.$transaction(async (tx) => {
        const domain = await upsertDomain({ hostname }, tx);

        return tx.link.create({
            data: {
                slug: input.slug,
                targetUrl: input.targetUrl,
                ownerId: input.ownerId,
                domainId: domain.id,
            },
            select: {
                id: true,
                domainId: true,
                slug: true,
                targetUrl: true,
                ownerId: true,
            },
        });
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

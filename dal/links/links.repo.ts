import { CreatedLink, CreateLinkInput } from '@/dal/links/links.types';
import { prisma } from '@/lib/prisma';
import { normalizeHostnameFromUrl } from '@/lib/utils';
import { InvalidHostnameError } from '@/lib/errors/InvalidHostnameError';
import { upsertDomain } from '@/dal/domains/domains.repo';
import { upsertDomainEnrichmentJob } from '@/dal/domain_enrichment_jobs/domain_enrichment_jobs.repo';
import { DomainEnrichmentJobStatus } from '@/generated/prisma/enums';
import { upsertLinkEnrichmentJob } from '@/dal/link_enrichment_jobs/link_enrichment_jobs.repo';
import { RedirectProbeResult } from '@/lib/redirect_safety/redirect_safety_types';

export async function createLink(input: CreateLinkInput): Promise<CreatedLink> {
    const hostname = normalizeHostnameFromUrl(input.targetUrl);

    if (!hostname) {
        throw new InvalidHostnameError();
    }

    const createdLink: CreatedLink = await prisma.$transaction(async (tx) => {
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

    await upsertDomainEnrichmentJob({
        domainId: createdLink.domainId!,
        status: DomainEnrichmentJobStatus.PENDING,
    });

    await upsertLinkEnrichmentJob(createdLink.id);

    return createdLink;
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

export async function applyRedirectProbeResult(
    linkId: string,
    result: RedirectProbeResult,
    isShortener: boolean
): Promise<void> {
    if (result.kind === 'redirect') {
        await prisma.link.update({
            where: { id: linkId },
            data: {
                isShortener,
                redirectTargetUrl: result.targetUrl,
                redirectStatusCode: result.statusCode,
                redirectCheckedAt: new Date(),
            },
        });
    } else {
        await prisma.link.update({
            where: { id: linkId },
            data: {
                isShortener: false,
                redirectTargetUrl: null,
                redirectStatusCode: null,
                redirectCheckedAt: new Date(),
            },
        });
    }
}

import { CreatedLink, CreateLinkInput, LinkRedirectData } from '@/dal/links/links.types';
import { prisma } from '@/lib/prisma';
import { normalizeHostnameFromUrl } from '@/lib/utils';
import { InvalidHostnameError } from '@/lib/errors/InvalidHostnameError';
import { upsertDomain } from '@/dal/domains/domains.repo';
import { upsertDomainEnrichmentJob } from '@/dal/domain_enrichment_jobs/domain_enrichment_jobs.repo';
import { DomainEnrichmentJobStatus } from '@/generated/prisma/enums';
import { upsertLinkEnrichmentJob } from '@/dal/link_enrichment_jobs/link_enrichment_jobs.repo';
import { RedirectProbeResult } from '@/lib/redirect_safety/redirect_safety_types';
import { Prisma } from '@/generated/prisma/client';

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

export async function createLinkTx(tx: Prisma.TransactionClient, input: CreateLinkInput): Promise<CreatedLink> {
    const hostname = normalizeHostnameFromUrl(input.targetUrl);
    if (!hostname) throw new InvalidHostnameError();

    const domain = await upsertDomain({ hostname }, tx);

    return tx.link.create({
        data: {
            slug: input.slug,
            targetUrl: input.targetUrl,
            ownerId: input.ownerId,
            domainId: domain.id,
        },
        select: { id: true, domainId: true, slug: true, targetUrl: true, ownerId: true },
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

export async function findLinkForRedirect(slug: string): Promise<LinkRedirectData | null> {
    const link = await prisma.link.findUnique({
        where: { slug },
        select: {
            slug: true,
            targetUrl: true,
            isShortener: true,
            redirectTargetUrl: true,
            redirectStatusCode: true,
            redirectCheckedAt: true,
            domain: {
                select: {
                    hostname: true,
                    status: true,
                    registeredAt: true,
                    checkedAt: true,
                },
            },
        },
    });

    if (!link) return null;

    return link;
}

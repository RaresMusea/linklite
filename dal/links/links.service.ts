import { CreatedLink, CreateLinkInput } from '@/dal/links/links.types';
import { prisma } from '@/lib/prisma';
import { incrementAnonActorQuotaCountTx } from '@/dal/anon_actors/anon_actors.repo';
import { QuotaExceededError } from '@/lib/errors/QuotaExceededError';
import { upsertDomainEnrichmentJob } from '@/dal/domain_enrichment_jobs/domain_enrichment_jobs.repo';
import { upsertLinkEnrichmentJob } from '@/dal/link_enrichment_jobs/link_enrichment_jobs.repo';
import { createLinkTx } from '@/dal/links/links.repo';
import { DomainEnrichmentJobStatus } from '@/generated/prisma/enums';

export async function createAnonLinkWithQuota(
    input: CreateLinkInput,
    anonId: string,
    limit: number
): Promise<CreatedLink> {
    const createdLink = await prisma.$transaction(async (tx) => {
        const succeeded = await incrementAnonActorQuotaCountTx(anonId, limit, tx);

        if (!succeeded) {
            throw new QuotaExceededError(limit);
        }

        return createLinkTx(tx, input);
    });

    await upsertDomainEnrichmentJob({ domainId: createdLink.domainId!, status: DomainEnrichmentJobStatus.PENDING });
    await upsertLinkEnrichmentJob(createdLink.id);

    return createdLink;
}

import { UpsertDomainEnrichmentJobInput } from '@/dal/domain_enrichment_jobs/domain_enrichment_jobs.types';
import { prisma } from '@/lib/prisma';

export async function upsertDomainEnrichmentJob(input: UpsertDomainEnrichmentJobInput): Promise<void> {
    await prisma.domainEnrichmentJob.upsert({
        where: { domainId: input.domainId },
        create: { domainId: input.domainId },
        update: {
            status: input.status,
            runAfter: new Date(),
        },
    });
}

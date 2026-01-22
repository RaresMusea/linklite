import {
    NextDomainEnrichmentJob,
    UpsertDomainEnrichmentJobInput,
} from '@/dal/domain_enrichment_jobs/domain_enrichment_jobs.types';
import { prisma } from '@/lib/prisma';
import { DomainEnrichmentJobStatus } from '@/generated/prisma/enums';

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

export async function claimNextDomainEnrichmentJob(): Promise<NextDomainEnrichmentJob | null> {
    const now = new Date();

    const job: NextDomainEnrichmentJob | null = await prisma.domainEnrichmentJob.findFirst({
        where: { status: DomainEnrichmentJobStatus.PENDING, runAfter: { lte: now } },
        orderBy: { createdAt: 'asc' },
        select: {
            id: true,
            attempts: true,
            domainId: true,
            domain: { select: { hostname: true } },
        },
    });

    if (!job) return null;

    const claimed = await prisma.domainEnrichmentJob.updateMany({
        where: { id: job.id, status: DomainEnrichmentJobStatus.PENDING },
        data: {
            status: DomainEnrichmentJobStatus.RUNNING,
            attempts: { increment: 1 },
            lastError: null,
        },
    });

    if (claimed.count !== 1) return null;

    return { ...job, attempts: job.attempts + 1 };
}

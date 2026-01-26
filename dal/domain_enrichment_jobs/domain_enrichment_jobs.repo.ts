import {
    ClaimedDomainJob,
    UpsertDomainEnrichmentJobInput,
} from '@/dal/domain_enrichment_jobs/domain_enrichment_jobs.types';
import { prisma } from '@/lib/prisma';
import { DomainEnrichmentJobStatus } from '@/generated/prisma/enums';

const LEASE_MS = 2 * 60_000; // 2 minutes
const STALE_GRACE_MS = 0;
const MAX_BACKOFF_MIN = 60;

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

export async function claimNextDomainEnrichmentJob(): Promise<ClaimedDomainJob | null> {
    const now = new Date();
    const newLease = new Date(now.getTime() + LEASE_MS);

    const candidate = await prisma.domainEnrichmentJob.findFirst({
        where: {
            runAfter: { lte: now },
            OR: [
                { status: DomainEnrichmentJobStatus.PENDING },
                {
                    status: DomainEnrichmentJobStatus.RUNNING,
                    lockedUntil: { lt: new Date(now.getTime() - STALE_GRACE_MS) },
                },
            ],
        },
        orderBy: [{ runAfter: 'asc' }, { createdAt: 'asc' }],
        select: {
            id: true,
            attempts: true,
            domainId: true,
            domain: { select: { hostname: true } },
        },
    });

    if (!candidate) return null;

    const claimed = await prisma.domainEnrichmentJob.updateMany({
        where: {
            id: candidate.id,
            runAfter: { lte: now },
            OR: [
                { status: DomainEnrichmentJobStatus.PENDING },
                {
                    status: DomainEnrichmentJobStatus.RUNNING,
                    lockedUntil: { lt: new Date(now.getTime() - STALE_GRACE_MS) },
                },
            ],
        },
        data: {
            status: DomainEnrichmentJobStatus.RUNNING,
            lockedUntil: newLease,
            attempts: { increment: 1 },
            lastError: null,
        },
    });

    if (claimed.count !== 1) return null;

    return {
        id: candidate.id,
        domainId: candidate.domainId,
        hostname: candidate.domain.hostname,
        attempts: candidate.attempts + 1,
    };
}

export async function markDomainEnrichmentJobAsDone(jobId: string): Promise<void> {
    await prisma.domainEnrichmentJob.update({
        where: { id: jobId },
        data: {
            status: DomainEnrichmentJobStatus.DONE,
            lockedUntil: null,
            lastError: null,
        },
    });
}

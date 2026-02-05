import { prisma } from '@/lib/prisma';
import { ClaimedLinkJob } from '@/dal/link_enrichment_jobs/link_enrichment_jobs.types';
import { LinkEnrichmentJobStatus } from '@/generated/prisma/enums';

const LEASE_MS = 30_000; // 30 seconds
const STALE_GRACE_MS = 15_000; // 15 seonds

export async function upsertLinkEnrichmentJob(linkId: string) {
    await prisma.linkEnrichmentJob.upsert({
        where: { linkId },
        create: {
            linkId,
        },
        update: {
            status: 'PENDING',
            runAfter: new Date(),
            lockedUntil: null,
        },
    });
}

export async function claimNextLinkEnrichmentJob(): Promise<ClaimedLinkJob | null> {
    const now = new Date();
    const newLease = new Date(now.getTime() + LEASE_MS);
    const staleBefore = new Date(now.getTime() - STALE_GRACE_MS);

    const candidate = await prisma.linkEnrichmentJob.findFirst({
        where: {
            runAfter: { lte: now },
            OR: [
                { status: LinkEnrichmentJobStatus.PENDING },
                {
                    status: LinkEnrichmentJobStatus.RUNNING,
                    lockedUntil: { lt: staleBefore },
                },
            ],
        },
        orderBy: [{ runAfter: 'asc' }, { createdAt: 'asc' }],
        select: {
            id: true,
            attempts: true,
            linkId: true,
            link: { select: { targetUrl: true } },
        },
    });

    if (!candidate) return null;

    const claimed = await prisma.linkEnrichmentJob.updateMany({
        where: {
            id: candidate.id,
            runAfter: { lte: now },
            OR: [
                { status: LinkEnrichmentJobStatus.PENDING },
                {
                    status: LinkEnrichmentJobStatus.RUNNING,
                    lockedUntil: { lt: staleBefore },
                },
            ],
            attempts: candidate.attempts, // opțional, extra safety
        },
        data: {
            status: LinkEnrichmentJobStatus.RUNNING,
            lockedUntil: newLease,
            attempts: { increment: 1 },
            lastError: null,
        },
    });

    if (claimed.count !== 1) return null;

    return {
        id: candidate.id,
        linkId: candidate.linkId,
        targetUrl: candidate.link.targetUrl,
        attempts: candidate.attempts + 1,
    };
}

export async function markLinkEnrichmentJobAsDone(jobId: string) {
    await prisma.linkEnrichmentJob.update({
        where: { id: jobId },
        data: {
            status: LinkEnrichmentJobStatus.DONE,
            lockedUntil: null,
            lastError: null,
        },
    });
}

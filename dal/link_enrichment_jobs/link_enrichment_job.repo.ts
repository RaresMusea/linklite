import { prisma } from '@/lib/prisma';

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

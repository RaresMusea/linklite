import { prisma } from '@/lib/prisma';

export async function upsertAnonActor(anonId: string, ipHash: string): Promise<void> {
    await prisma.anonActor.upsert({
        where: { anonId },
        create: {
            anonId,
            createdCount: 0,
            firstSeenAt: new Date(),
            lastIpAddrHash: ipHash ?? undefined,
        },
        update: {
            lastIpAddrHash: ipHash ?? undefined,
        },
    });
}

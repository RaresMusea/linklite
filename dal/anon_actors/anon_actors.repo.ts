import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';

export async function upsertAnonActor(anonId: string, ipHash: string | null) {
    return prisma.anonActor.upsert({
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

export async function incrementAnonActorQuotaCountTx(
    anonId: string,
    limit: number,
    tx: Prisma.TransactionClient
): Promise<boolean> {
    const res = await tx.anonActor.updateMany({
        where: { anonId, createdCount: { lt: limit } },
        data: { createdCount: { increment: 1 } },
    });

    return res.count === 1;
}

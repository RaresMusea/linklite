import { AnonActor } from '@/generated/prisma/client';

type AnonActorQuota = {
    anonId: string;
    createdCount: number;
};

export function toAnonActorQuota(anonActor: AnonActor): AnonActorQuota {
    return {
        anonId: anonActor.anonId,
        createdCount: anonActor.createdCount,
    };
}

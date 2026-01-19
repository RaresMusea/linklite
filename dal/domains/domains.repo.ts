import { CreateDomainInput, UpsertedDomain } from '@/dal/domains/domains.types';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';

type PrismaLike = typeof prisma | Prisma.TransactionClient;

/**
 * Upserts a **`Domain`** by hostname.
 * - Creates a new record if hostname doesn't exist (`firstSeenAt` set by `default(now())`)
 * - Otherwise returns the existing record (does not modify `firstSeenAt`)
 */
export async function upsertDomain(input: CreateDomainInput, db: PrismaLike = prisma): Promise<UpsertedDomain> {
    return db.domain.upsert({
        where: { hostname: input.hostname },
        create: {
            hostname: input.hostname,
        },
        update: {},
        select: {
            id: true,
            hostname: true,
            firstSeenAt: true,

            // provider-agnostic derived fields
            registeredAt: true,
            checkedAt: true,
            source: true,
            status: true,

            // RDAP cache metadata (optional, but useful)
            rdapFetchedAt: true,
        },
    });
}

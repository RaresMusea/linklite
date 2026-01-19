import { CreateDomainInput, RdapDomainParams, UpsertedDomain } from '@/dal/domains/domains.types';
import { prisma } from '@/lib/prisma';
import { Domain, Prisma } from '@/generated/prisma/client';

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

/**
 * Updates a **`Domain`** by its ID.
 * - Updates the domain accordingly, by modifying its adjacent domain RDAP parameters
 */
export async function updateDomainRdap(domainId: string, params: RdapDomainParams): Promise<Domain> {
    const now = new Date();

    const data: Prisma.DomainUpdateInput = {
        registeredAt: params.registeredAt,
        status: params.status,
        source: params.source,
        rdapFetchedAt: params.rdapFetchedAt ?? now,
        checkedAt: params.checkedAt ?? now,
        ...(params.rdapRaw !== undefined ? { rdapRaw: params.rdapRaw } : {}),
    };

    return prisma.domain.update({
        where: { id: domainId },
        data,
    });
}

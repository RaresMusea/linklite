import {
    CreateDomainInput, DomainProviderLocks,
    UpdateDomainBestKnownInput,
    UpdateDomainRdapCacheInput,
    UpdateDomainWhoisCacheInput,
    UpsertedDomain,
} from '@/dal/domains/domains.types';
import { prisma } from '@/lib/prisma';
import { Domain, Prisma } from '@/generated/prisma/client';
import { RdapDomainParams } from '@/lib/rdap/rdap.types';
import { computeRdapFetchCooldown } from '@/lib/rdap/rdap.cooldown';
import { computeWhoisFetchCooldown } from '@/lib/whois/whois.cooldown';

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

            registeredAt: true,
            checkedAt: true,
            source: true,
            status: true,
            rdapFetchedAt: true,
            whoisFetchedAt: true,
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

export async function updateDomainRdapCache(input: UpdateDomainRdapCacheInput): Promise<void> {
    const now = new Date();

    const cooldown = computeRdapFetchCooldown(now, input.status);

    await prisma.domain.update({
        where: { id: input.domainId },
        data: {
            rdapFetchedAt: input.rdapFetchedAt,
            rdapRaw: input.rdapRaw,
            rdapFetchLockedUntil: cooldown,
        },
    });
}


export async function updateDomainWhoisCache(input: UpdateDomainWhoisCacheInput): Promise<void> {
    const now = new Date();
    const cooldown = computeWhoisFetchCooldown(now, input.status);

    await prisma.domain.update({
        where: { id: input.domainId },
        data: {
            whoisFetchedAt: input.whoisFetchedAt,
            whoisRaw: input.whoisRaw,
            whoisFetchLockedUntil: cooldown,
        },
    });
}

export async function updateDomainBestKnown(input: UpdateDomainBestKnownInput): Promise<void> {
    await prisma.domain.update({
        where: { id: input.domainId },
        data: {
            registeredAt: input.registeredAt,
            checkedAt: input.checkedAt! ?? null,
            source: input.source,
            status: input.status,
        },
    });
}


export async function getDomainProvidersLocks(domainId: string): Promise<DomainProviderLocks | null> {
    const locks = await prisma.domain.findUnique({
        where: { id: domainId },
        select: {
            rdapFetchLockedUntil: true,
            whoisFetchLockedUntil: true,
        }
    });

    if (!locks || !locks.rdapFetchLockedUntil || !locks.whoisFetchLockedUntil) return null;

    return locks;
}

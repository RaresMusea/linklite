import { DomainSource, DomainStatus, Prisma } from '@/generated/prisma/client';

export type CreateDomainInput = {
    hostname: string;
};

export type UpsertedDomain = {
    id: string;
    hostname: string;
    firstSeenAt: Date;

    registeredAt: Date | null;
    checkedAt: Date | null;
    source: string | null;
    status: string | null;

    rdapFetchedAt: Date | null;
    whoisFetchedAt: Date | null;
};

export type UpdateDomainRdapCacheInput = {
    domainId: string;
    rdapFetchedAt: Date | null;
    rdapRaw?: Prisma.InputJsonValue;
};

export type UpdateDomainWhoisCacheInput = {
    domainId: string;
    whoisFetchedAt: Date | null;
    whoisRaw: string | null;
};

export type UpdateDomainBestKnownInput = {
    domainId: string;
    registeredAt: Date | null;
    checkedAt: Date;
    source: DomainSource;
    status: DomainStatus;
};

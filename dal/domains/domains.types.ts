import { DomainSource, DomainStatus, Prisma } from '@/generated/prisma/client';
import { RdapStatus } from '@/lib/rdap/rdap.types';
import { WhoisStatus } from '@/lib/whois/whois.types';

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
    rdapFetchedAt?: Date;
    rdapRaw?: Prisma.InputJsonValue;
    status: RdapStatus;
};

export type UpdateDomainWhoisCacheInput = {
    domainId: string;
    whoisFetchedAt?: Date;
    whoisRaw?: string;
    status: WhoisStatus;
};

export type UpdateDomainBestKnownInput = {
    domainId: string;
    registeredAt: Date | null;
    checkedAt: Date;
    source: DomainSource;
    status: DomainStatus;
};

export type BestKnownDomainInfo = {
    registeredAt: Date | null;
    checkedAt: Date;
    source: DomainSource;
    status: DomainStatus;
};

import { Prisma } from '@/generated/prisma/client';

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
};

export enum RdapStatus {
    OK = 'OK',
    MISSING = 'MISSING',
    REDACTED = 'REDACTED',
    UNSUPPORTED = 'UNSUPPORTED',
    ERROR = 'ERROR',
}

export type RdapDomainParams = {
    registeredAt: Date | null;
    status: RdapStatus;

    rdapRaw?: Prisma.InputJsonValue;
    rdapFetchedAt?: Date;
    checkedAt?: Date;
    source?: 'RDAP';
};

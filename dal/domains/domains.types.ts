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

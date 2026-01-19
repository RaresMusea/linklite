export type CreateDomainInput = {
    hostname: string;
};

export type UpsertedDomain = {
    id: string;
    hostname: string;
    firstSeenAt: Date;
    whoisCreatedAt: Date | null;
    whoisCheckedAt: Date | null;
};

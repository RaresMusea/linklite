import { DomainEnrichmentJobStatus } from '@/generated/prisma/enums';

export type UpsertDomainEnrichmentJobInput = {
    domainId: string;
    status: DomainEnrichmentJobStatus;
};

export type ClaimedDomainJob = {
    id: string;
    domainId: string;
    hostname: string;
    attempts: number;
};

export type RequeueDomainEnrichmentJobInput = {
    jobId: string;
    attempts: number;
    error: Error | string;
    runAfter?: Date;
};

export type DomainEnrichmentSummary = {
    registeredAtFound: boolean;
    provider: 'RDAP' | 'WHOIS' | 'UNKNOWN';
    domainStatus: string;
    jobStatus: string;
};

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

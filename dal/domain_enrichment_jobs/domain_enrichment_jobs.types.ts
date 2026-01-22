import { DomainEnrichmentJobStatus } from '@/generated/prisma/enums';

export type UpsertDomainEnrichmentJobInput = {
    domainId: string;
    status: DomainEnrichmentJobStatus;
};

export type NextDomainEnrichmentJob = {
    id: string;
    attempts: number;
    domainId: string;
    domain: {
        hostname: string;
    }
}

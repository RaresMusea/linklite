import { DomainEnrichmentJobStatus } from '@/generated/prisma/enums';

export type UpsertDomainEnrichmentJobInput = {
    domainId: string;
    status: DomainEnrichmentJobStatus;
};

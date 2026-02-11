import { getRdapInfo, getWhoisInfo, pickBestKnown } from '@/dal/domains/domains.service';
import { RdapDomainParams, RdapStatus } from '@/lib/rdap/rdap.types';
import {
    getDomainById,
    updateDomainBestKnown,
    updateDomainRdapCache,
    updateDomainWhoisCache,
} from '@/dal/domains/domains.repo';
import { WhoisDomainParams } from '@/lib/whois/whois.types';
import { DomainEnrichmentSummary } from '@/dal/domain_enrichment_jobs/domain_enrichment_jobs.types';
import { getDomainEnrichmentJobById } from '@/dal/domain_enrichment_jobs/domain_enrichment_jobs.repo';
import { logger } from '@/lib/logging/logger';

export async function processDomainEnrichment(hostname: string, domainId: string): Promise<void> {
    const rdap: RdapDomainParams = await getRdapInfo(hostname);

    await updateDomainRdapCache({
        domainId: domainId,
        rdapFetchedAt: rdap.rdapFetchedAt,
        rdapRaw: rdap.rdapRaw,
        status: rdap.status,
    });

    let whois: WhoisDomainParams | null = null;

    const shouldFallback =
        rdap.status === RdapStatus.UNSUPPORTED ||
        rdap.status === RdapStatus.ERROR ||
        rdap.status === RdapStatus.MISSING;

    if (shouldFallback) {
        whois = await getWhoisInfo(hostname);

        await updateDomainWhoisCache({
            domainId: domainId,
            whoisFetchedAt: whois.whoisFetchedAt,
            whoisRaw: whois.whoisRaw,
            status: whois.status,
        });
    }

    const best = pickBestKnown(rdap, whois);

    if (best) {
        await updateDomainBestKnown({ domainId, ...best });
    }
}

export async function generateDomainEnrichmentJobSummary(jobId: string): Promise<DomainEnrichmentSummary | null> {
    const job = await getDomainEnrichmentJobById(jobId);

    if (!job) {
        logger.warn(`Could not find domain enrichment job with ID=${jobId}`);
        return null;
    }

    const domain = await getDomainById(job.domainId);

    if (!domain) {
        logger.warn(`Could not find domain with ID=${job.domainId}`);
        return null;
    }

    return {
        registeredAtFound: !!domain.registeredAt,
        provider: domain.source,
        domainStatus: domain.status,
        jobStatus: job.status,
    };
}

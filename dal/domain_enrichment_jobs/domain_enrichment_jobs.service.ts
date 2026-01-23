import { getRdapInfo, getWhoisInfo, pickBestKnown } from '@/dal/domains/domains.service';
import { RdapDomainParams, RdapStatus } from '@/lib/rdap/rdap.types';
import { updateDomainBestKnown, updateDomainRdapCache, updateDomainWhoisCache } from '@/dal/domains/domains.repo';
import { WhoisDomainParams } from '@/lib/whois/whois.types';

export async function processDomainEnrichment(hostname: string, domainId: string): Promise<void> {
    const rdap: RdapDomainParams = await getRdapInfo(hostname);

    await updateDomainRdapCache({
        domainId: domainId,
        rdapFetchedAt: rdap.rdapFetchedAt,
        rdapRaw: rdap.rdapRaw,
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
        });
    }

    const best = pickBestKnown(rdap, whois);

    if (best) {
        await updateDomainBestKnown({ domainId, ...best });
    }
}

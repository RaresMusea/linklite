import { getRegistrableDomain } from '@/lib/utils';
import { extractRegistrationDate, fetchRdapJson, getRdapUrl, isRedactedRegistration } from '@/lib/rdap/rdap.endpoints';
import { FetchRdapInfoResponse, RdapDomainParams, RdapStatus } from '@/lib/rdap/rdap.types';
import { Prisma } from '@/generated/prisma/client';
import { WhoisDomainParams, WhoisStatus } from '@/lib/whois/whois.types';

export async function getRdapInfo(host: string): Promise<RdapDomainParams> {
    const now = new Date();

    const domain = getRegistrableDomain(host) ?? null;

    if (!domain) {
        return getRdapDomainParams(now, RdapStatus.UNSUPPORTED);
    }

    const url = getRdapUrl(domain);

    if (!url) {
        return getRdapDomainParams(now, RdapStatus.UNSUPPORTED);
    }

    const fetched: FetchRdapInfoResponse = await fetchRdapJson(url);

    if (!fetched.ok) {
        if (fetched.status === 404) {
            return getRdapDomainParams(now, RdapStatus.MISSING, now);
        }

        return getRdapDomainParams(now, RdapStatus.ERROR, now);
    }

    const registeredAt = extractRegistrationDate(fetched.json);
    let status: RdapStatus = RdapStatus.MISSING;

    if (registeredAt) {
        status = RdapStatus.OK;
    } else if (isRedactedRegistration(fetched.json)) {
        status = RdapStatus.REDACTED;
    }

    return {
        ...getRdapDomainParams(now, status, now, registeredAt),
        rdapRaw: fetched.json as Prisma.InputJsonValue,
    };
}

// export async function getWhoisInfo(hostname: string): Promise<WhoisDomainParams> {
//     const now = new Date();
//
//     const domain = getRegistrableDomain(hostname) ?? null;
//
//     if (!domain) {
//         return getWhoisDomainParams(now, WhoisStatus.UNSUPPORTED);
//     }
//
//     const url
// }

function getRdapDomainParams(
    date: Date,
    status: RdapStatus,
    rdapFetchedAt?: Date,
    registeredAt: Date | null = null
): RdapDomainParams {
    return {
        registeredAt,
        status,
        source: 'RDAP',
        checkedAt: date,
        rdapFetchedAt,
    };
}

function getWhoisDomainParams(
    date: Date,
    status: WhoisStatus,
    whoisFetchedAt?: Date,
    registeredAt: Date | null = null
): WhoisDomainParams {
    return {
        registeredAt,
        status,
        source: 'WHOIS',
        checkedAt: date,
        whoisFetchedAt,
    };
}

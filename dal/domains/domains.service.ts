import { getRegistrableDomain } from '@/lib/utils';
import {
    extractRegistrationDate,
    fetchRdapJson,
    getRdapUrl,
    isRedactedRdapRegistration,
} from '@/lib/rdap/rdap.endpoints';
import { FetchRdapInfoResponse, RdapDomainParams, RdapStatus } from '@/lib/rdap/rdap.types';
import { Prisma } from '@/generated/prisma/client';
import { FetchWhoisInfoResponse, WhoisDomainParams, WhoisStatus } from '@/lib/whois/whois.types';
import { extractWhoisRegistrationDate, fetchWhoisTextViaCli, isWhoisRedacted } from '@/lib/whois/whois.endpoints';

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
    } else if (isRedactedRdapRegistration(fetched.json)) {
        status = RdapStatus.REDACTED;
    }

    return {
        ...getRdapDomainParams(now, status, now, registeredAt),
        rdapRaw: fetched.json as Prisma.InputJsonValue,
    };
}

export async function getWhoisInfo(hostname: string): Promise<WhoisDomainParams> {
    const now = new Date();

    const domain = getRegistrableDomain(hostname) ?? null;

    if (!domain) {
        return getWhoisDomainParams(now, WhoisStatus.UNSUPPORTED);
    }

    const fetched: FetchWhoisInfoResponse = await fetchWhoisTextViaCli(domain);

    if (!fetched.ok) {
        if (fetched.status === 404) {
            return getWhoisDomainParams(now, WhoisStatus.MISSING, now);
        }

        return getWhoisDomainParams(now, WhoisStatus.ERROR, now);
    }

    const registeredAt = extractWhoisRegistrationDate(fetched.text);
    let status: WhoisStatus = WhoisStatus.MISSING;

    if (registeredAt) {
        status = WhoisStatus.OK;
    } else if (isWhoisRedacted(fetched.text)) {
        status = WhoisStatus.REDACTED;
    }

    return {
        ...getWhoisDomainParams(now, status, now, registeredAt),
        whoisRaw: fetched.text,
    };
}

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

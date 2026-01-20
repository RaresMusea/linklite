import { RdapDomainParams, RdapStatus } from '@/dal/domains/domains.types';
import { getRegistrableDomain } from '@/lib/utils';
import { extractRegistrationDate, fetchRdapJson, getRdapUrl, isRedactedRegistration } from '@/lib/rdap/rdap.endpoints';
import { FetchRdapInfoResponse } from '@/lib/rdap/rdap.types';
import { Prisma } from '@/generated/prisma/client';

export async function getRdapInfo(host: string): Promise<RdapDomainParams> {
    const now = new Date();

    const domain = getRegistrableDomain(host) ?? null;

    if (!domain) {
        return getDomainParams(now, RdapStatus.UNSUPPORTED);
    }

    const url = getRdapUrl(domain);

    if (!url) {
        return getDomainParams(now, RdapStatus.UNSUPPORTED);
    }

    const fetched: FetchRdapInfoResponse = await fetchRdapJson(url);

    if (!fetched.ok) {
        if (fetched.status === 404) {
            return getDomainParams(now, RdapStatus.MISSING, now);
        }

        return getDomainParams(now, RdapStatus.ERROR, now);
    }

    const registeredAt = extractRegistrationDate(fetched.json);
    let status: RdapStatus = RdapStatus.MISSING;

    if (registeredAt) {
        status = RdapStatus.OK;
    } else if (isRedactedRegistration(fetched.json)) {
        status = RdapStatus.REDACTED;
    }

    return {
        ...getDomainParams(now, status, now, registeredAt),
        rdapRaw: fetched.json as Prisma.InputJsonValue,
    };
}

function getDomainParams(
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

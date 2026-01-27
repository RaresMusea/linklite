import { RdapStatus } from '@/lib/rdap/rdap.types';
import { WhoisStatus } from '@/lib/whois/whois.types';
import { DomainStatus } from '@/generated/prisma/enums';

export function mapStatusToDomainStatus<T extends RdapStatus | WhoisStatus>(s: T): DomainStatus {
    switch (s) {
        case RdapStatus.OK:
        case WhoisStatus.OK:
            return DomainStatus.OK;
        case RdapStatus.MISSING:
        case WhoisStatus.MISSING:
            return DomainStatus.MISSING;
        case RdapStatus.REDACTED:
        case WhoisStatus.REDACTED:
            return DomainStatus.REDACTED;
        case RdapStatus.UNSUPPORTED:
        case WhoisStatus.UNSUPPORTED:
            return DomainStatus.UNSUPPORTED;
        case RdapStatus.ERROR:
        case WhoisStatus.ERROR:
            return DomainStatus.ERROR;
    }
}

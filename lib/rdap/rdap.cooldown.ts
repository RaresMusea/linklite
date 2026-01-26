import { RdapStatus } from '@/lib/rdap/rdap.types';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

export function computeRdapFetchCooldown(
    now: Date,
    status: RdapStatus
): Date {
    switch (status) {
        case RdapStatus.OK:
            return new Date(now.getTime() + 30 * DAY);

        case RdapStatus.REDACTED:
            return new Date(now.getTime() + 14 * DAY);

        case RdapStatus.MISSING:
            return new Date(now.getTime() + 7 * DAY);

        case RdapStatus.ERROR:
            return new Date(now.getTime() + 60 * MINUTE);

        case RdapStatus.UNSUPPORTED:
            return new Date(now.getTime() + 180 * DAY);

        default: {
            const _exhaustive: never = status;
            return now;
        }
    }
}
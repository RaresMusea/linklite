import { WhoisStatus } from '@/lib/whois/whois.types';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

export function computeWhoisFetchCooldown(now: Date, status: WhoisStatus): Date {
    switch (status) {
        case WhoisStatus.OK:
            return new Date(now.getTime() + 90 * DAY);

        case WhoisStatus.REDACTED:
            return new Date(now.getTime() + 30 * DAY);

        case WhoisStatus.MISSING:
            return new Date(now.getTime() + 30 * DAY);

        case WhoisStatus.ERROR:
            return new Date(now.getTime() + 360 * MINUTE);

        case WhoisStatus.UNSUPPORTED:
            return new Date(now.getTime() + 365 * DAY);

        default: {
            const _exhaustive: never = status;
            return now;
        }
    }
}

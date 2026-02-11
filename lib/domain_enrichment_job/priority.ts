import { DomainStatus } from '@/generated/prisma/enums';

export function getStatusPriority(status: DomainStatus): number {
    switch (status) {
        case DomainStatus.OK:
            return 5;
        case DomainStatus.REDACTED:
            return 4;
        case DomainStatus.MISSING:
            return 3;
        case DomainStatus.UNSUPPORTED:
            return 2;
        case DomainStatus.ERROR:
            return 1;
        case DomainStatus.UNKNOWN:
        default:
            return 0;
    }
}

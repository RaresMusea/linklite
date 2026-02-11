import { DomainStatus } from '@/generated/prisma/enums';

export type DomainAge = 'Old' | 'New' | 'Unknown';

export type DomainAgeClassifierInput = {
    registeredAt: Date | null;
    status: DomainStatus;
    checkedAt: Date | null;
    options: {
        newDomainDays?: number; // the number of days a domain should have in order to be considered new
        maxProviderCheckedAgeDays?: number; // the maximum number of days since the domain was last checked via providers (RDAP / WHPIS), in order to be considered new
    };
};

export type DomainAgeUnknownReason =
    | 'no_checked_at'
    | 'checked_at_stale'
    | 'invalid_checked_at'
    | 'unsupported_status'
    | 'redacted'
    | 'missing_registered_at'
    | 'invalid_registered_at';

export type DomainAgeResult = {
    age: DomainAge;
    reason?: DomainAgeUnknownReason;
};

export type RedirectProbeResult =
    | {
          kind: 'no-redirect';
      }
    | {
          kind: 'redirect';
          statusCode: number;
          targetUrl: string;
          targetHost: string;
      };

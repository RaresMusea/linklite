import { DomainStatus } from '@/generated/prisma/enums';
import { RiskReason } from '@/lib/redirect_safety/redirect_scoring_risk_calculator';

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

export type DomainAgeRiskFlag =
    | { kind: 'new_domain' }
    | { kind: 'old_domain' }
    | { kind: 'unknown_domain_age'; reason?: string };

export type RiskContext = {
    url: string;
    hostname?: string;
    hasDomain: boolean;
    isHttps: boolean;
    isShortener: boolean;
    hasRedirect302: boolean;
    suspiciousPath: boolean;
    lowTrustTld: boolean;
    unknownTld: boolean;
    newDomain: boolean;
    allowlisted: boolean;
};

export type RiskSignal = {
    id: RiskReason;
    points: number;
    when: boolean;
};

import {
    DomainAgeClassifierInput,
    DomainAgeResult,
    DomainAgeRiskFlag,
} from '@/lib/redirect_safety/redirect_safety_types';
import { getDaysAgeFrom } from '@/lib/dates';
import { DomainStatus } from '@/generated/prisma/enums';
import { Domain } from '@/generated/prisma/client';
import { MinimalDomain } from '@/dal/domains/domains.types';

const NEW_DOMAIN_DAYS_DEFAULT = 30;
const MAX_CHECKED_AGE_DAYS_DEFAULT = 45;

const UNKNOWN_STATUSES: DomainStatus[] = [
    DomainStatus.ERROR,
    DomainStatus.MISSING,
    DomainStatus.UNKNOWN,
    DomainStatus.UNSUPPORTED,
];

function fromDomainToClassifierInput(input: Domain): DomainAgeClassifierInput {
    return {
        registeredAt: input.registeredAt,
        status: input.status,
        checkedAt: input.checkedAt,
        options: {
            newDomainDays: NEW_DOMAIN_DAYS_DEFAULT,
            maxProviderCheckedAgeDays: MAX_CHECKED_AGE_DAYS_DEFAULT,
        },
    };
}

export function classifyDomainAge(input: DomainAgeClassifierInput): DomainAgeResult {
    const NEW_DAYS = input.options?.newDomainDays ?? NEW_DOMAIN_DAYS_DEFAULT;
    const MAX_CHECKED_AGE_DAYS = input.options?.maxProviderCheckedAgeDays ?? MAX_CHECKED_AGE_DAYS_DEFAULT;

    if (!input.checkedAt) {
        return { age: 'Unknown', reason: 'no_checked_at' };
    }

    const checkedAgeDays = getDaysAgeFrom(input.checkedAt);
    if (checkedAgeDays < 0) {
        return { age: 'Unknown', reason: 'invalid_checked_at' };
    }
    if (checkedAgeDays > MAX_CHECKED_AGE_DAYS) {
        return { age: 'Unknown', reason: 'checked_at_stale' };
    }

    if (UNKNOWN_STATUSES.includes(input.status)) {
        return { age: 'Unknown', reason: 'unsupported_status' };
    }

    if (input.status === DomainStatus.REDACTED) {
        return { age: 'Unknown', reason: 'redacted' };
    }

    if (!input.registeredAt) {
        return { age: 'Unknown', reason: 'missing_registered_at' };
    }

    const registeredAgeDays = getDaysAgeFrom(input.registeredAt);
    if (registeredAgeDays < 0) {
        return { age: 'Unknown', reason: 'invalid_registered_at' };
    }

    return {
        age: registeredAgeDays <= NEW_DAYS ? 'New' : 'Old',
    };
}

export function domainAgeRiskFlag(domain: Domain | null): DomainAgeRiskFlag {
    if (!domain) return { kind: 'unknown_domain_age', reason: 'missing_domain' };

    const res = classifyDomainAge(fromDomainToClassifierInput(domain));

    if (res.age === 'New') return { kind: 'new_domain' };
    if (res.age === 'Old') return { kind: 'old_domain' };
    return { kind: 'unknown_domain_age', reason: res.reason };
}

export function isNewDomain(domain: MinimalDomain | null, options = {}): boolean {
    if (!domain) return false;
    return (
        classifyDomainAge({
            registeredAt: domain.registeredAt,
            status: domain.status,
            checkedAt: domain.checkedAt,
            options,
        }).age === 'New'
    );
}

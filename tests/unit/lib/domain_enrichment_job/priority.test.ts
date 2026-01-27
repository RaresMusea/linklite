import { describe, it, expect } from 'vitest';
import { DomainStatus } from '@/generated/prisma/enums';
import { getStatusPriority } from '@/lib/domain_enrichment_job/priority';

describe('getStatusPriority', () => {
    const priorityMap = {
        [DomainStatus.OK]: 5,
        [DomainStatus.REDACTED]: 4,
        [DomainStatus.MISSING]: 3,
        [DomainStatus.UNSUPPORTED]: 2,
        [DomainStatus.ERROR]: 1,
        [DomainStatus.UNKNOWN]: 0,
    };

    Object.entries(priorityMap).forEach(([status, expectedPriority]) => {
        it(`should return ${expectedPriority} for ${status} status`, () => {
            expect(getStatusPriority(status as DomainStatus)).toBe(expectedPriority);
        });
    });

    it('should maintain correct priority ordering', () => {
        const priorities = Object.values(DomainStatus).map((status) => ({
            status,
            priority: getStatusPriority(status),
        }));

        const sortedByPriority = [...priorities].sort((a, b) => b.priority - a.priority);

        expect(sortedByPriority.map((p) => p.status)).toEqual([
            DomainStatus.OK,
            DomainStatus.REDACTED,
            DomainStatus.MISSING,
            DomainStatus.UNSUPPORTED,
            DomainStatus.ERROR,
            DomainStatus.UNKNOWN,
        ]);
    });
});

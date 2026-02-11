import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RdapStatus } from '@/lib/rdap/rdap.types';
import { computeRdapFetchCooldown } from '@/lib/rdap/rdap.cooldown';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

describe('RDAP cooldowns tests', () => {
    const fixedDate = new Date('2024-01-01T12:00:00Z');

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(fixedDate);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Status: OK', () => {
        it('Should return date 30 days in the future', () => {
            const result = computeRdapFetchCooldown(fixedDate, RdapStatus.OK);
            const expected = new Date(fixedDate.getTime() + 30 * DAY);
            expect(result).toEqual(expected);
        });
    });

    describe('Status: REDACTED', () => {
        it('Should return date 14 days in the future', () => {
            const result = computeRdapFetchCooldown(fixedDate, RdapStatus.REDACTED);
            const expected = new Date(fixedDate.getTime() + 14 * DAY);
            expect(result).toEqual(expected);
        });
    });

    describe('Status: MISSING', () => {
        it('Should return date 7 days in the future', () => {
            const result = computeRdapFetchCooldown(fixedDate, RdapStatus.MISSING);
            const expected = new Date(fixedDate.getTime() + 7 * DAY);
            expect(result).toEqual(expected);
        });
    });

    describe('Status: ERROR', () => {
        it('Should return date 60 minutes in the future', () => {
            const result = computeRdapFetchCooldown(fixedDate, RdapStatus.ERROR);
            const expected = new Date(fixedDate.getTime() + 60 * MINUTE);
            expect(result).toEqual(expected);
        });
    });

    describe('Status: UNSUPPORTED', () => {
        it('Should return date 180 days in the future', () => {
            const result = computeRdapFetchCooldown(fixedDate, RdapStatus.UNSUPPORTED);
            const expected = new Date(fixedDate.getTime() + 180 * DAY);
            expect(result).toEqual(expected);
        });
    });

    describe('Edge cases', () => {
        it('Should handle different "now" dates correctly', () => {
            const customDate = new Date('2023-12-25T00:00:00Z');
            const result = computeRdapFetchCooldown(customDate, RdapStatus.OK);
            const expected = new Date(customDate.getTime() + 30 * DAY);
            expect(result).toEqual(expected);
        });

        it('Should handle midnight dates correctly', () => {
            const midnight = new Date('2024-01-01T00:00:00Z');
            const result = computeRdapFetchCooldown(midnight, RdapStatus.REDACTED);
            const expected = new Date(midnight.getTime() + 14 * DAY);
            expect(result).toEqual(expected);
        });

        it('Should handle end of month dates correctly', () => {
            const endOfMonth = new Date('2024-01-31T23:59:59Z');
            const result = computeRdapFetchCooldown(endOfMonth, RdapStatus.OK);
            const expected = new Date(endOfMonth.getTime() + 30 * DAY);
            expect(result).toEqual(expected);
        });
    });

    describe('TypeScript exhaustiveness check', () => {
        it('Should return current date for unknown status (type safety test)', () => {
            const invalidStatus = 'INVALID' as never as RdapStatus;
            const result = computeRdapFetchCooldown(fixedDate, invalidStatus);
            expect(result).toEqual(fixedDate);
        });
    });

    describe('Constant values', () => {
        it('Should use correct day and minute constants', () => {
            const testDate = new Date('2024-01-01T00:00:00Z');

            const minuteResult = computeRdapFetchCooldown(testDate, RdapStatus.ERROR);
            const dayResult = computeRdapFetchCooldown(testDate, RdapStatus.OK);

            expect(minuteResult.getTime() - testDate.getTime()).toBe(60 * MINUTE);
            expect(dayResult.getTime() - testDate.getTime()).toBe(30 * DAY);
        });
    });
});

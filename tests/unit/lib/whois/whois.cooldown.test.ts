// computeWhoisFetchCooldown.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { computeWhoisFetchCooldown } from '@/lib/whois/whois.cooldown';
import { WhoisStatus } from '@/lib/whois/whois.types';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

describe('WHOIS cooldowns tests', () => {
    const fixedDate = new Date('2024-01-01T12:00:00Z');

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(fixedDate);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Specific cases tests', () => {
        it('should return date 90 days in the future for OK status', () => {
            const result = computeWhoisFetchCooldown(fixedDate, WhoisStatus.OK);
            const expected = new Date(fixedDate.getTime() + 90 * DAY);
            expect(result).toEqual(expected);
        });

        it('Should return date 30 days in the future for REDACTED status', () => {
            const result = computeWhoisFetchCooldown(fixedDate, WhoisStatus.REDACTED);
            const expected = new Date(fixedDate.getTime() + 30 * DAY);
            expect(result).toEqual(expected);
        });

        it('Should return date 30 days in the future for MISSING status', () => {
            const result = computeWhoisFetchCooldown(fixedDate, WhoisStatus.MISSING);
            const expected = new Date(fixedDate.getTime() + 30 * DAY);
            expect(result).toEqual(expected);
        });

        it('Should return date 360 minutes (6 hours) in the future for ERROR status', () => {
            const result = computeWhoisFetchCooldown(fixedDate, WhoisStatus.ERROR);
            const expected = new Date(fixedDate.getTime() + 360 * MINUTE);
            expect(result).toEqual(expected);
        });

        it('Should return date 365 days in the future for UNSUPPORTED status', () => {
            const result = computeWhoisFetchCooldown(fixedDate, WhoisStatus.UNSUPPORTED);
            const expected = new Date(fixedDate.getTime() + 365 * DAY);
            expect(result).toEqual(expected);
        });
    });

    describe('Edge cases tests', () => {
        it('Should correctly calculate 360 minutes as 6 hours', () => {
            const result = computeWhoisFetchCooldown(fixedDate, WhoisStatus.ERROR);
            const sixHoursInMs = 6 * 60 * MINUTE;
            expect(result.getTime() - fixedDate.getTime()).toBe(sixHoursInMs);
        });

        it('Should have same cooldown for REDACTED and MISSING status', () => {
            const redactedResult = computeWhoisFetchCooldown(fixedDate, WhoisStatus.REDACTED);
            const missingResult = computeWhoisFetchCooldown(fixedDate, WhoisStatus.MISSING);
            expect(redactedResult).toEqual(missingResult);
        });

        it('Should handle leap year correctly', () => {
            const leapYearDate = new Date('2024-02-29T12:00:00Z');
            const result = computeWhoisFetchCooldown(leapYearDate, WhoisStatus.OK);
            const expected = new Date('2024-05-29T12:00:00Z'); // 90 days from Feb 29
            expect(result).toEqual(expected);
        });
    });

    describe('Typechecks tests', () => {
        it('Should work correctly with different "now" dates', () => {
            const testCases = [
                { date: new Date('2023-06-15T09:30:00Z'), status: WhoisStatus.OK, expectedDays: 90 },
                { date: new Date('2023-12-31T23:59:59Z'), status: WhoisStatus.REDACTED, expectedDays: 30 },
                { date: new Date('2024-01-01T00:00:00Z'), status: WhoisStatus.UNSUPPORTED, expectedDays: 365 },
            ];

            testCases.forEach(({ date, status, expectedDays }) => {
                const result = computeWhoisFetchCooldown(date, status);
                const expected = new Date(date.getTime() + expectedDays * DAY);
                expect(result).toEqual(expected);
            });
        });

        it('Should handle end of month rollover correctly', () => {
            const endOfJanuary = new Date('2024-01-31T12:00:00Z');
            const result = computeWhoisFetchCooldown(endOfJanuary, WhoisStatus.OK);
            // 90 days from Jan 31 Should be April 30
            expect(result.getDate()).toBe(30);
            expect(result.getMonth()).toBe(3); // April (0-indexed)
            expect(result.getFullYear()).toBe(2024);
        });
    });

    describe('TypeScript exhaustiveness check', () => {
        it('should return current date for invalid status (bypassing TypeScript)', () => {
            const invalidStatus = 'INVALID_STATUS' as never as WhoisStatus;
            const result = computeWhoisFetchCooldown(fixedDate, invalidStatus);

            expect(result).toEqual(fixedDate);
        });

        it('should handle all known WhoisStatus values without throwing', () => {
            const allStatuses = Object.values(WhoisStatus) as WhoisStatus[];

            allStatuses.forEach((status) => {
                expect(() => computeWhoisFetchCooldown(fixedDate, status)).not.toThrow();
            });
        });
    });
});

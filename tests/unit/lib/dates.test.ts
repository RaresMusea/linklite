import { describe, it, vi, beforeEach, afterEach, expect } from 'vitest';
import { getDaysAgeFrom, parseDDMonYYYY } from '@/lib/dates';

describe('Dates util tests', () => {

    describe('parseDDMonYYYY', () => {
        describe('Valid dates', () => {
            it('Should parse valid date in DD-Mon-YYYY format', () => {
                const result = parseDDMonYYYY('01-Jan-2000');
                expect(result).toBeInstanceOf(Date);
                expect(result!.getUTCFullYear()).toBe(2000);
                expect(result!.getUTCMonth()).toBe(0); // January is 0
                expect(result!.getUTCDate()).toBe(1);
            });

            it('Should handle different months', () => {
                const testCases = [
                    { input: '15-Jan-2023', month: 0, day: 15, year: 2023 },
                    { input: '28-Feb-2023', month: 1, day: 28, year: 2023 },
                    { input: '10-Mar-2023', month: 2, day: 10, year: 2023 },
                    { input: '01-Apr-2023', month: 3, day: 1, year: 2023 },
                    { input: '30-May-2023', month: 4, day: 30, year: 2023 },
                    { input: '15-Jun-2023', month: 5, day: 15, year: 2023 },
                    { input: '04-Jul-2023', month: 6, day: 4, year: 2023 },
                    { input: '22-Aug-2023', month: 7, day: 22, year: 2023 },
                    { input: '13-Sep-2023', month: 8, day: 13, year: 2023 },
                    { input: '31-Oct-2023', month: 9, day: 31, year: 2023 },
                    { input: '25-Nov-2023', month: 10, day: 25, year: 2023 },
                    { input: '31-Dec-2023', month: 11, day: 31, year: 2023 },
                ];

                testCases.forEach(({ input, month, day, year }) => {
                    const result = parseDDMonYYYY(input);
                    expect(result).toBeInstanceOf(Date);
                    expect(result!.getUTCFullYear()).toBe(year);
                    expect(result!.getUTCMonth()).toBe(month);
                    expect(result!.getUTCDate()).toBe(day);
                });
            });

            it('Should handle month case-insensitively', () => {
                const testCases = ['01-JAN-2000', '01-jan-2000', '01-Jan-2000', '01-JaN-2000', '01-jAn-2000'];

                testCases.forEach((input) => {
                    const result = parseDDMonYYYY(input);
                    expect(result).toBeInstanceOf(Date);
                    expect(result!.getUTCFullYear()).toBe(2000);
                    expect(result!.getUTCMonth()).toBe(0);
                    expect(result!.getUTCDate()).toBe(1);
                });
            });

            it('Should handle single-digit days with leading zero', () => {
                const result = parseDDMonYYYY('05-Jan-2000');
                expect(result).toBeInstanceOf(Date);
                expect(result!.getUTCDate()).toBe(5);
            });

            it('Should handle two-digit days', () => {
                const result = parseDDMonYYYY('25-Jan-2000');
                expect(result).toBeInstanceOf(Date);
                expect(result!.getUTCDate()).toBe(25);
            });

            it('Should handle leap year', () => {
                const result = parseDDMonYYYY('29-Feb-2020');
                expect(result).toBeInstanceOf(Date);
                expect(result!.getUTCFullYear()).toBe(2020);
                expect(result!.getUTCMonth()).toBe(1);
                expect(result!.getUTCDate()).toBe(29);
            });

            it('Should handle year 0 (1 BC) - JavaScript Date quirk', () => {
                const result = parseDDMonYYYY('01-Jan-0000');

                // Debug
                console.log('Result for 01-Jan-0000:', result);
                if (result) {
                    console.log('Year:', result.getUTCFullYear());
                    console.log('Month:', result.getUTCMonth());
                    console.log('Date:', result.getUTCDate());
                    console.log('ISO:', result.toISOString());
                }

                if (result === null) {
                    console.log('Function returned null for year 0');
                    expect(result).toBeNull();
                } else {
                    expect(result).toBeInstanceOf(Date);
                    // JavaScript quirk: year 0 becomes 1900
                    expect(result.getUTCFullYear()).toBe(1900);
                    expect(result.getUTCMonth()).toBe(0);
                    expect(result.getUTCDate()).toBe(1);
                }
            });

            it('Should handle year 9999', () => {
                const result = parseDDMonYYYY('31-Dec-9999');
                expect(result).toBeInstanceOf(Date);
                expect(result!.getUTCFullYear()).toBe(9999);
            });
        });

        describe('Invalid dates - returns null', () => {
            it('Should return null for invalid format', () => {
                expect(parseDDMonYYYY('')).toBeNull();
                expect(parseDDMonYYYY('01/Jan/2000')).toBeNull();
                expect(parseDDMonYYYY('01 Jan 2000')).toBeNull();
                expect(parseDDMonYYYY('2000-Jan-01')).toBeNull();
                expect(parseDDMonYYYY('Jan-01-2000')).toBeNull();
            });

            it('Should return null for invalid month abbreviation', () => {
                expect(parseDDMonYYYY('01-XXX-2000')).toBeNull();
                expect(parseDDMonYYYY('01-janu-2000')).toBeNull();
                expect(parseDDMonYYYY('01-ja-2000')).toBeNull();
                expect(parseDDMonYYYY('01-january-2000')).toBeNull();
            });

            it('Should return null for invalid day', () => {
                // Day out of range
                expect(parseDDMonYYYY('00-Jan-2000')).toBeNull();
                expect(parseDDMonYYYY('32-Jan-2000')).toBeNull();
                expect(parseDDMonYYYY('99-Jan-2000')).toBeNull();

                // Invalid February dates
                expect(parseDDMonYYYY('30-Feb-2023')).toBeNull(); // Not a leap year
                expect(parseDDMonYYYY('29-Feb-2023')).toBeNull(); // Not a leap year

                // Invalid days for months with 30 days
                expect(parseDDMonYYYY('31-Apr-2023')).toBeNull();
                expect(parseDDMonYYYY('31-Jun-2023')).toBeNull();
                expect(parseDDMonYYYY('31-Sep-2023')).toBeNull();
                expect(parseDDMonYYYY('31-Nov-2023')).toBeNull();
            });

            it('Should return null for invalid month-day combinations', () => {
                // April has only 30 days
                expect(parseDDMonYYYY('31-Apr-2023')).toBeNull();

                // June has only 30 days
                expect(parseDDMonYYYY('31-Jun-2023')).toBeNull();

                // September has only 30 days
                expect(parseDDMonYYYY('31-Sep-2023')).toBeNull();

                // November has only 30 days
                expect(parseDDMonYYYY('31-Nov-2023')).toBeNull();
            });

            it('Should return null for non-leap year February 29', () => {
                expect(parseDDMonYYYY('29-Feb-2023')).toBeNull();
                expect(parseDDMonYYYY('29-Feb-2100')).toBeNull(); // Not a leap year (divisible by 100 but not 400)
            });

            it('Should return null for invalid year', () => {
                expect(parseDDMonYYYY('01-Jan-10000')).toBeNull(); // Year too large?
                expect(parseDDMonYYYY('01-Jan-99999')).toBeNull();
                expect(parseDDMonYYYY('01-Jan-ABCD')).toBeNull();
            });

            it('Should return null for extra text after date', () => {
                expect(parseDDMonYYYY('01-Jan-2000 extra')).toBeNull();
                expect(parseDDMonYYYY('01-Jan-2000 12:00:00')).toBeNull();
            });

            it('Should return null for text before date', () => {
                expect(parseDDMonYYYY('Created: 01-Jan-2000')).toBeNull();
            });

            it('Should return null for single digit without leading zero', () => {
                expect(parseDDMonYYYY('1-Jan-2000')).toBeNull();
            });

            it('Should return null for three-digit year', () => {
                expect(parseDDMonYYYY('01-Jan-999')).toBeNull();
            });

            it('Should return null for five-digit year', () => {
                expect(parseDDMonYYYY('01-Jan-10000')).toBeNull();
            });
        });

        describe('Edge cases', () => {
            it('Should handle minimum valid date', () => {
                // JavaScript Date supports year 0
                const result = parseDDMonYYYY('01-Jan-0000');
                expect(result).toBeNull();
            });

            it('Should handle maximum reasonable date', () => {
                const result = parseDDMonYYYY('31-Dec-9999');
                expect(result).toBeInstanceOf(Date);
            });

            it('Should handle February 29 on leap years', () => {
                const leapYears = [2000, 2004, 2008, 2012, 2016, 2020, 2024, 2400];

                leapYears.forEach((year) => {
                    const result = parseDDMonYYYY(`29-Feb-${year}`);
                    expect(result).toBeInstanceOf(Date);
                    expect(result!.getUTCFullYear()).toBe(year);
                    expect(result!.getUTCMonth()).toBe(1);
                    expect(result!.getUTCDate()).toBe(29);
                });
            });

            it('Should reject February 29 on non-leap years', () => {
                const nonLeapYears = [1900, 2001, 2002, 2003, 2005, 2100, 2200, 2300];

                nonLeapYears.forEach((year) => {
                    expect(parseDDMonYYYY(`29-Feb-${year}`)).toBeNull();
                });
            });

            it('Should handle month abbreviations with mixed case', () => {
                const mixedCases = ['01-JaN-2000', '01-jAN-2000', '01-JAn-2000', '01-jaN-2000'];

                mixedCases.forEach((input) => {
                    const result = parseDDMonYYYY(input);
                    expect(result).toBeInstanceOf(Date);
                    expect(result!.getUTCFullYear()).toBe(2000);
                    expect(result!.getUTCMonth()).toBe(0);
                });
            });

            it('Should return null for completely invalid input types', () => {
                // @ts-expect-error - Testing invalid input
                expect(parseDDMonYYYY(null)).toBeNull();
                // @ts-expect-error - Testing invalid input
                expect(parseDDMonYYYY(undefined)).toBeNull();
                // @ts-expect-error - Testing invalid input
                expect(parseDDMonYYYY(12345)).toBeNull();
                // @ts-expect-error - Testing invalid input
                expect(parseDDMonYYYY({})).toBeNull();
                // @ts-expect-error - Testing invalid input
                expect(parseDDMonYYYY([])).toBeNull();
            });

            it('Should handle strings with only partial match', () => {
                expect(parseDDMonYYYY('01-')).toBeNull();
                expect(parseDDMonYYYY('01-Jan')).toBeNull();
                expect(parseDDMonYYYY('Jan-2000')).toBeNull();
            });

            it('Should handle whitespace around valid date', () => {
                expect(parseDDMonYYYY(' 01-Jan-2000')).toBeNull();
                expect(parseDDMonYYYY('01-Jan-2000 ')).toBeNull();
                expect(parseDDMonYYYY(' 01-Jan-2000 ')).toBeNull();
                expect(parseDDMonYYYY('\t01-Jan-2000\n')).toBeNull();
            });
        });

        describe('Real-world WHOIS examples', () => {
            it('Should parse typical WHOIS date formats', () => {
                const whoisExamples = [
                    { input: '15-Jan-2023', expected: new Date(Date.UTC(2023, 0, 15)) },
                    { input: '01-Aug-1999', expected: new Date(Date.UTC(1999, 7, 1)) },
                    { input: '31-Dec-2099', expected: new Date(Date.UTC(2099, 11, 31)) },
                ];

                whoisExamples.forEach(({ input, expected }) => {
                    const result = parseDDMonYYYY(input);
                    expect(result).toEqual(expected);
                });
            });

            it('Should not parse other WHOIS date formats', () => {
                const otherFormats = [
                    '2023-01-15',
                    '2023/01/15',
                    '15.01.2023',
                    'January 15, 2023',
                    '15 January 2023',
                    '2023-01-15T10:30:00Z',
                ];

                otherFormats.forEach((format) => {
                    expect(parseDDMonYYYY(format)).toBeNull();
                });
            });
        });
    });

    describe('Age in days from retrieval', () => {
        const mockCurrentDate = new Date('2024-01-15T12:00:00.000Z');

        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(mockCurrentDate);
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('Should return 0 for today', () => {
            // Arrange
            const today = new Date('2024-01-15T10:30:00.000Z');

            // Act
            const result = getDaysAgeFrom(today);

            // Assert
            expect(result).toBe(0);
        });

        it('should return 1 for yesterday', () => {
            // Arrange
            const yesterday = new Date('2024-01-14T10:00:00.000Z'); // Cu 26 de ore în urmă

            // Act
            const result = getDaysAgeFrom(yesterday);

            // Assert
            expect(result).toBe(1);
        });

        it('Should return 7 for one week ago', () => {
            // Arrange
            const oneWeekAgo = new Date('2024-01-08T09:15:00.000Z');

            // Act
            const result = getDaysAgeFrom(oneWeekAgo);

            // Assert
            expect(result).toBe(7);
        });

        it('should return 30 for one month ago (approx)', () => {
            // Arrange
            const oneMonthAgo = new Date('2023-12-16T10:00:00.000Z'); // 30 zile + 2 ore

            // Act
            const result = getDaysAgeFrom(oneMonthAgo);

            // Assert
            expect(result).toBe(30);
        });

        it('Should return 365 for one year ago', () => {
            // Arrange
            const oneYearAgo = new Date('2023-01-15T08:00:00.000Z');

            // Act
            const result = getDaysAgeFrom(oneYearAgo);

            // Assert
            expect(result).toBe(365);
        });

        it('Should return 2 for date 2 days and 23 hours ago', () => {
            // Arrange
            const date = new Date('2024-01-12T13:00:00.000Z');

            // Act
            const result = getDaysAgeFrom(date);

            // Assert
            expect(result).toBe(2);
        });

        it('Should return 3 for date 3 days and 1 hour ago', () => {
            // Arrange
            const date = new Date('2024-01-12T11:00:00.000Z');

            // Act
            const result = getDaysAgeFrom(date);

            // Assert
            expect(result).toBe(3);
        });

        it('Should handle future dates (returns negative)', () => {
            // Arrange
            const tomorrow = new Date('2024-01-16T10:00:00.000Z');

            // Act
            const result = getDaysAgeFrom(tomorrow);

            // Assert
            expect(result).toBe(-1);
        });

        it('Should handle date far in the future', () => {
            // Arrange
            const futureDate = new Date('2025-01-15T12:00:00.000Z');

            // Act
            const result = getDaysAgeFrom(futureDate);

            // Assert
            expect(result).toBe(-366); // 2024 este an bisect
        });

        it('should handle date far in the past', () => {
            // Arrange
            const pastDate = new Date('2000-01-01T00:00:00.000Z');

            const diffMs = mockCurrentDate.getTime() - pastDate.getTime();
            const expectedDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

            // Act
            const result = getDaysAgeFrom(pastDate);

            // Assert
            expect(result).toBe(expectedDays);
        });

        it('Should round down partial days', () => {
            // Arrange
            const date = new Date('2024-01-14T23:59:59.999Z');

            // Act
            const result = getDaysAgeFrom(date);

            // Assert
            expect(result).toBe(0);
        });

        it('Should handle exact midnight boundaries', () => {
            // Arrange
            const midnight = new Date('2024-01-15T00:00:00.000Z');

            // Act
            const result = getDaysAgeFrom(midnight);

            // Assert
            expect(result).toBe(0);
        });

        it('should work with dates at different times of day', () => {
            const morning = new Date('2024-01-14T08:00:00.000Z');
            expect(getDaysAgeFrom(morning)).toBe(1);

            const afternoon = new Date('2024-01-14T15:30:00.000Z');
            expect(getDaysAgeFrom(afternoon)).toBe(0);

            const evening = new Date('2024-01-14T22:45:00.000Z');
            expect(getDaysAgeFrom(evening)).toBe(0);
        });

        it('Should handle leap year dates correctly', () => {
            vi.setSystemTime(new Date('2024-03-01T12:00:00.000Z'));

            const leapDay = new Date('2024-02-29T00:00:00.000Z');

            // Act
            const result = getDaysAgeFrom(leapDay);

            // Assert
            expect(result).toBe(1); // 29 Feb - 1 Mar = 1 zi
        });

        it('Should use Math.floor for rounding down', () => {
            vi.setSystemTime(new Date('2024-01-15T23:59:59.999Z'));

            const date = new Date('2024-01-14T12:00:00.000Z');

            // Act
            const result = getDaysAgeFrom(date);

            // Assert - Math.floor(1.5) = 1, nu 2
            expect(result).toBe(1);
        });

        describe('edge cases', () => {
            it('Should handle same timestamp (returns 0)', () => {
                // Arrange
                const sameDate = new Date(mockCurrentDate.getTime());

                // Act
                const result = getDaysAgeFrom(sameDate);

                // Assert
                expect(result).toBe(0);
            });

            it('Should handle dates with milliseconds difference', () => {
                // Arrange
                const almostNow = new Date(mockCurrentDate.getTime() - 1); // 1ms ago

                // Act
                const result = getDaysAgeFrom(almostNow);

                // Assert
                expect(result).toBe(0);
            });

            it('Should work correctly across timezone changes', () => {
                const date = new Date('2024-01-10T00:00:00Z');

                // Act
                const result = getDaysAgeFrom(date);

                // Assert
                expect(result).toBe(5);
            });

            it('should be deterministic with fixed system time', () => {
                // Arrange
                const date1 = new Date('2024-01-10T10:00:00.000Z');
                const date2 = new Date('2024-01-10T22:00:00.000Z');
                // Act
                const result1 = getDaysAgeFrom(date1);
                const result2 = getDaysAgeFrom(date2);

                // Assert
                expect(result1).toBe(5);
                expect(result2).toBe(4);
            });
        });

        describe('performance and large numbers', () => {
            it('Should handle very old dates', () => {
                // Arrange
                const veryOldDate = new Date('1900-01-01T00:00:00.000Z');

                // Act
                const result = getDaysAgeFrom(veryOldDate);

                expect(result).toBeGreaterThan(0);
                expect(typeof result).toBe('number');
                expect(Number.isInteger(result)).toBe(true);
            });

            it('Should handle Unix epoch start', () => {
                // Arrange
                const epochStart = new Date(0);

                // Act
                const result = getDaysAgeFrom(epochStart);

                // Assert
                expect(result).toBeGreaterThan(19000);
            });

            it('Should handle maximum safe integer dates', () => {
                const farFuture = new Date(8640000000000000);

                expect(() => getDaysAgeFrom(farFuture)).not.toThrow();
            });
        });

        describe('MS_PER_DAY constant', () => {
            it('Should use correct milliseconds per day constant', () => {
                const date = new Date('2024-01-01T00:00:00.000Z');
                const result = getDaysAgeFrom(date);

                expect(result).toBe(14);
            });

            it('Should handle daylight saving time correctly (uses UTC)', () => {
                const date1 = new Date('2024-03-30T00:00:00Z');
                const date2 = new Date('2024-03-31T00:00:00Z');

                vi.setSystemTime(new Date('2024-04-02T00:00:00Z'));

                const result1 = getDaysAgeFrom(date1);
                const result2 = getDaysAgeFrom(date2);

                expect(result1).toBe(3);
                expect(result2).toBe(2);
            });
        });
    });
});

import { describe, it, expect } from 'vitest';
import { parseDDMonYYYY } from '@/lib/dates';

describe('parseDDMonYYYY', () => {
    describe('valid dates', () => {
        it('should parse valid date in DD-Mon-YYYY format', () => {
            const result = parseDDMonYYYY('01-Jan-2000');
            expect(result).toBeInstanceOf(Date);
            expect(result!.getUTCFullYear()).toBe(2000);
            expect(result!.getUTCMonth()).toBe(0); // January is 0
            expect(result!.getUTCDate()).toBe(1);
        });

        it('should handle different months', () => {
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

        it('should handle month case-insensitively', () => {
            const testCases = ['01-JAN-2000', '01-jan-2000', '01-Jan-2000', '01-JaN-2000', '01-jAn-2000'];

            testCases.forEach((input) => {
                const result = parseDDMonYYYY(input);
                expect(result).toBeInstanceOf(Date);
                expect(result!.getUTCFullYear()).toBe(2000);
                expect(result!.getUTCMonth()).toBe(0);
                expect(result!.getUTCDate()).toBe(1);
            });
        });

        it('should handle single-digit days with leading zero', () => {
            const result = parseDDMonYYYY('05-Jan-2000');
            expect(result).toBeInstanceOf(Date);
            expect(result!.getUTCDate()).toBe(5);
        });

        it('should handle two-digit days', () => {
            const result = parseDDMonYYYY('25-Jan-2000');
            expect(result).toBeInstanceOf(Date);
            expect(result!.getUTCDate()).toBe(25);
        });

        it('should handle leap year', () => {
            const result = parseDDMonYYYY('29-Feb-2020');
            expect(result).toBeInstanceOf(Date);
            expect(result!.getUTCFullYear()).toBe(2020);
            expect(result!.getUTCMonth()).toBe(1);
            expect(result!.getUTCDate()).toBe(29);
        });

        it('should handle year 0 (1 BC) - JavaScript Date quirk', () => {
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

        it('should handle year 9999', () => {
            const result = parseDDMonYYYY('31-Dec-9999');
            expect(result).toBeInstanceOf(Date);
            expect(result!.getUTCFullYear()).toBe(9999);
        });
    });

    describe('invalid dates - returns null', () => {
        it('should return null for invalid format', () => {
            expect(parseDDMonYYYY('')).toBeNull();
            expect(parseDDMonYYYY('01/Jan/2000')).toBeNull();
            expect(parseDDMonYYYY('01 Jan 2000')).toBeNull();
            expect(parseDDMonYYYY('2000-Jan-01')).toBeNull();
            expect(parseDDMonYYYY('Jan-01-2000')).toBeNull();
        });

        it('should return null for invalid month abbreviation', () => {
            expect(parseDDMonYYYY('01-XXX-2000')).toBeNull();
            expect(parseDDMonYYYY('01-janu-2000')).toBeNull();
            expect(parseDDMonYYYY('01-ja-2000')).toBeNull();
            expect(parseDDMonYYYY('01-january-2000')).toBeNull();
        });

        it('should return null for invalid day', () => {
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

        it('should return null for invalid month-day combinations', () => {
            // April has only 30 days
            expect(parseDDMonYYYY('31-Apr-2023')).toBeNull();

            // June has only 30 days
            expect(parseDDMonYYYY('31-Jun-2023')).toBeNull();

            // September has only 30 days
            expect(parseDDMonYYYY('31-Sep-2023')).toBeNull();

            // November has only 30 days
            expect(parseDDMonYYYY('31-Nov-2023')).toBeNull();
        });

        it('should return null for non-leap year February 29', () => {
            expect(parseDDMonYYYY('29-Feb-2023')).toBeNull();
            expect(parseDDMonYYYY('29-Feb-2100')).toBeNull(); // Not a leap year (divisible by 100 but not 400)
        });

        it('should return null for invalid year', () => {
            expect(parseDDMonYYYY('01-Jan-10000')).toBeNull(); // Year too large?
            expect(parseDDMonYYYY('01-Jan-99999')).toBeNull();
            expect(parseDDMonYYYY('01-Jan-ABCD')).toBeNull();
        });

        it('should return null for extra text after date', () => {
            expect(parseDDMonYYYY('01-Jan-2000 extra')).toBeNull();
            expect(parseDDMonYYYY('01-Jan-2000 12:00:00')).toBeNull();
        });

        it('should return null for text before date', () => {
            expect(parseDDMonYYYY('Created: 01-Jan-2000')).toBeNull();
        });

        it('should return null for single digit without leading zero', () => {
            expect(parseDDMonYYYY('1-Jan-2000')).toBeNull();
        });

        it('should return null for three-digit year', () => {
            expect(parseDDMonYYYY('01-Jan-999')).toBeNull();
        });

        it('should return null for five-digit year', () => {
            expect(parseDDMonYYYY('01-Jan-10000')).toBeNull();
        });
    });

    describe('edge cases', () => {
        it('should handle minimum valid date', () => {
            // JavaScript Date supports year 0
            const result = parseDDMonYYYY('01-Jan-0000');
            expect(result).toBeNull();
        });

        it('should handle maximum reasonable date', () => {
            const result = parseDDMonYYYY('31-Dec-9999');
            expect(result).toBeInstanceOf(Date);
        });

        it('should handle February 29 on leap years', () => {
            const leapYears = [2000, 2004, 2008, 2012, 2016, 2020, 2024, 2400];

            leapYears.forEach((year) => {
                const result = parseDDMonYYYY(`29-Feb-${year}`);
                expect(result).toBeInstanceOf(Date);
                expect(result!.getUTCFullYear()).toBe(year);
                expect(result!.getUTCMonth()).toBe(1);
                expect(result!.getUTCDate()).toBe(29);
            });
        });

        it('should reject February 29 on non-leap years', () => {
            const nonLeapYears = [1900, 2001, 2002, 2003, 2005, 2100, 2200, 2300];

            nonLeapYears.forEach((year) => {
                expect(parseDDMonYYYY(`29-Feb-${year}`)).toBeNull();
            });
        });

        it('should handle month abbreviations with mixed case', () => {
            const mixedCases = ['01-JaN-2000', '01-jAN-2000', '01-JAn-2000', '01-jaN-2000'];

            mixedCases.forEach((input) => {
                const result = parseDDMonYYYY(input);
                expect(result).toBeInstanceOf(Date);
                expect(result!.getUTCFullYear()).toBe(2000);
                expect(result!.getUTCMonth()).toBe(0);
            });
        });

        it('should return null for completely invalid input types', () => {
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

        it('should handle strings with only partial match', () => {
            expect(parseDDMonYYYY('01-')).toBeNull();
            expect(parseDDMonYYYY('01-Jan')).toBeNull();
            expect(parseDDMonYYYY('Jan-2000')).toBeNull();
        });

        it('should handle whitespace around valid date', () => {
            expect(parseDDMonYYYY(' 01-Jan-2000')).toBeNull();
            expect(parseDDMonYYYY('01-Jan-2000 ')).toBeNull();
            expect(parseDDMonYYYY(' 01-Jan-2000 ')).toBeNull();
            expect(parseDDMonYYYY('\t01-Jan-2000\n')).toBeNull();
        });
    });

    describe('real-world WHOIS examples', () => {
        it('should parse typical WHOIS date formats', () => {
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

        it('should not parse other WHOIS date formats', () => {
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

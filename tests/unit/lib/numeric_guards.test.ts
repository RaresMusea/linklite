import { describe, it, expect } from 'vitest';

import { isFiniteNumber } from '@/lib/numeric_guards';

describe('Numeric guards tests', () => {
    describe('IsFiniteNumber', () => {
        it('Returns true for finite numbers', () => {
            expect(isFiniteNumber(0)).toBe(true);
            expect(isFiniteNumber(42)).toBe(true);
            expect(isFiniteNumber(-3.14)).toBe(true);
        });

        it('Returns false for non-finite numbers', () => {
            expect(isFiniteNumber(Number.POSITIVE_INFINITY)).toBe(false);
            expect(isFiniteNumber(Number.NEGATIVE_INFINITY)).toBe(false);
            expect(isFiniteNumber(Number.NaN)).toBe(false);
        });

        it('Returns false for non-number values', () => {
            expect(isFiniteNumber('123')).toBe(false);
            expect(isFiniteNumber(null)).toBe(false);
            expect(isFiniteNumber(undefined)).toBe(false);
            expect(isFiniteNumber({})).toBe(false);
            expect(isFiniteNumber([])).toBe(false);
            expect(isFiniteNumber(true)).toBe(false);
        });
    });
});

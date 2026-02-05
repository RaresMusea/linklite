import { describe, it, expect } from 'vitest';
import { computeBackoffMinutes } from '@/lib/exponential_backoff';

describe('Exponential Backoff tests', () => {
    describe('Compute Backoff Minutes', () => {
        it('Should return at least 1 minute for zero or negative attempts', () => {
            expect(computeBackoffMinutes(0)).toBe(1);
            expect(computeBackoffMinutes(-1)).toBe(1);
            expect(computeBackoffMinutes(-10)).toBe(1);
        });

        it('Should grow exponentially with attempts', () => {
            expect(computeBackoffMinutes(1)).toBe(2);
            expect(computeBackoffMinutes(2)).toBe(4);
            expect(computeBackoffMinutes(3)).toBe(8);
            expect(computeBackoffMinutes(4)).toBe(16);
            expect(computeBackoffMinutes(5)).toBe(32);
        });

        it('Should cap the backoff at 60 minutes', () => {
            expect(computeBackoffMinutes(6)).toBe(60); // 2^6 = 64
            expect(computeBackoffMinutes(7)).toBe(60);
            expect(computeBackoffMinutes(10)).toBe(60);
            expect(computeBackoffMinutes(20)).toBe(60);
        });

        it('Should cap exponent at 10 but still respect max backoff', () => {
            expect(computeBackoffMinutes(10)).toBe(60); // 2^10 = 1024, capped
            expect(computeBackoffMinutes(11)).toBe(60);
        });
    });
});

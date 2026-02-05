import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { msSince } from '@/lib/time';

describe('MsSince function tests', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('Should return elapsed milliseconds since the provided start time', () => {
        vi.setSystemTime(new Date('2024-01-01T00:00:10.000Z'));
        const startMs = Date.now();

        vi.setSystemTime(new Date('2024-01-01T00:00:12.345Z'));

        expect(msSince(startMs)).toBe(2345);
    });

    it('Should return 0 when start time equals current time', () => {
        const now = new Date('2024-01-01T00:00:00.000Z');
        vi.setSystemTime(now);

        const startMs = Date.now();

        expect(msSince(startMs)).toBe(0);
    });

    it('Should return negative values when start time is in the future', () => {
        vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

        const startMs = new Date('2024-01-01T00:00:01.000Z').getTime();

        expect(msSince(startMs)).toBe(-1000);
    });
});

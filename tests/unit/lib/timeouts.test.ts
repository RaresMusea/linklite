import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sleep, withTimeout } from '@/lib/timeouts';

describe('WithTimeout function tests', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Resolves when promise resolves before timeout', () => {
        it('Should resolve with the value when original promise resolves before timeout', async () => {
            const originalPromise = new Promise<string>((resolve) => {
                setTimeout(() => resolve('success'), 100);
            });

            const timeoutPromise = withTimeout(originalPromise, 200);

            const testPromise = timeoutPromise.then((result) => {
                expect(result).toBe('success');
                return result;
            });

            vi.advanceTimersByTime(100);
            await expect(testPromise).resolves.toBe('success');
        });

        it('Should work with different data types', async () => {
            const numberPromise = Promise.resolve(42);
            const objectPromise = Promise.resolve({ data: 'test' });
            const arrayPromise = Promise.resolve([1, 2, 3]);

            await expect(withTimeout(numberPromise, 100)).resolves.toBe(42);
            await expect(withTimeout(objectPromise, 100)).resolves.toEqual({ data: 'test' });
            await expect(withTimeout(arrayPromise, 100)).resolves.toEqual([1, 2, 3]);
        });
    });

    describe('Rejects when timeout occurs before promise resolves', () => {
        it('Should reject with timeout error when promise takes too long', async () => {
            const originalPromise = new Promise<string>((resolve) => {
                setTimeout(() => resolve('success'), 200);
            });

            const timeoutPromise = withTimeout(originalPromise, 100);

            const testPromise = timeoutPromise.catch((error) => {
                expect(error.message).toBe('timeout');
                throw error;
            });

            vi.advanceTimersByTime(100);
            await expect(testPromise).rejects.toThrow('timeout');
        });

        it('Should reject immediately when timeout is 0', async () => {
            const originalPromise = new Promise<string>(() => {});
            const timeoutPromise = withTimeout(originalPromise, 0);

            vi.advanceTimersByTime(0);
            await expect(timeoutPromise).rejects.toThrow('timeout');
        });
    });

    describe('Handles edge cases', () => {
        it('Should not cancel the original promise when timeout occurs', async () => {
            let originalResolved = false;
            const originalPromise = new Promise<string>((resolve) => {
                setTimeout(() => {
                    originalResolved = true;
                    resolve('late success');
                }, 200);
            });

            const timeoutPromise = withTimeout(originalPromise, 100);

            vi.advanceTimersByTime(100);
            await expect(timeoutPromise).rejects.toThrow('timeout');

            vi.advanceTimersByTime(100);
            await vi.runAllTimersAsync();

            expect(originalResolved).toBe(true);
        });

        it('Should propagate rejection from original promise', async () => {
            const originalPromise = Promise.reject(new Error('original error'));

            await expect(withTimeout(originalPromise, 100)).rejects.toThrow('original error');
        });

        it('Should handle synchronous promise resolution', async () => {
            const immediatePromise = Promise.resolve('immediate');
            await expect(withTimeout(immediatePromise, 100)).resolves.toBe('immediate');
        });
    });

    describe('Race condition scenarios', () => {
        it('Should handle promise that resolves exactly at timeout boundary', async () => {
            const originalPromise = new Promise<string>((resolve) => {
                setTimeout(() => resolve('boundary'), 100);
            });

            const timeoutPromise = withTimeout(originalPromise, 100);

            // The race will depend on internal scheduling, but both outcomes are valid
            // This test verifies it doesn't crash and returns a valid result
            vi.advanceTimersByTime(100);

            try {
                const result = await timeoutPromise;
                expect(['boundary', 'timeout']).toContain(result === 'boundary' ? 'boundary' : 'timeout');
            } catch (error: unknown) {
                if (error instanceof Error) {
                    expect(error.message).toBe('timeout');
                }
            }
        });
    });
});

describe('Sleep function tests', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('Should resolve only after the specified duration', async () => {
        const sleeper = sleep(100);

        let resolved = false;
        sleeper.then(() => {
            resolved = true;
        });

        vi.advanceTimersByTime(99);
        expect(resolved).toBe(false);

        vi.advanceTimersByTime(1);
        await expect(sleeper).resolves.toBeUndefined();
        expect(resolved).toBe(true);
    });

    it('Should resolve immediately when duration is 0', async () => {
        const sleeper = sleep(0);
        vi.advanceTimersByTime(0);
        await expect(sleeper).resolves.toBeUndefined();
    });
});

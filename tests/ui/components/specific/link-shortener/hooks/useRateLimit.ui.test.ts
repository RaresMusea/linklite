import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    toastDismiss: vi.fn(),
}));

vi.mock('sonner', () => ({
    toast: {
        dismiss: mocks.toastDismiss,
    },
}));

import { useRateLimit } from '@/components/specific/link-shortener/hooks/useRateLimit';

describe('useRateLimit hook tests', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('Returns initial non-limited state', () => {
        const { result } = renderHook(() => useRateLimit());

        expect(result.current.rateLimitRemainingSec).toBe(0);
        expect(result.current.isRateLimited).toBe(false);
    });

    it('Ignores invalid cooldown values', () => {
        const { result } = renderHook(() => useRateLimit());

        act(() => {
            result.current.startCooldown(undefined);
            result.current.startCooldown(0);
            result.current.startCooldown(-1);
            result.current.startCooldown(Number.NaN);
        });

        expect(result.current.rateLimitRemainingSec).toBe(0);
        expect(result.current.isRateLimited).toBe(false);
    });

    it('Starts cooldown and decreases every second', async () => {
        const { result } = renderHook(() => useRateLimit());

        act(() => {
            result.current.startCooldown(3);
        });

        expect(result.current.rateLimitRemainingSec).toBe(3);
        expect(result.current.isRateLimited).toBe(true);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });
        expect(result.current.rateLimitRemainingSec).toBe(2);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });
        expect(result.current.rateLimitRemainingSec).toBe(1);
    });

    it('Dismisses rate-limit toast when cooldown ends', async () => {
        const { result } = renderHook(() => useRateLimit());

        act(() => {
            result.current.startCooldown(2);
        });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });

        expect(result.current.rateLimitRemainingSec).toBe(0);
        expect(result.current.isRateLimited).toBe(false);
        expect(mocks.toastDismiss).toHaveBeenCalledWith('rate-limit-reached');
    });

    it('Does not shorten an existing longer cooldown', async () => {
        const { result } = renderHook(() => useRateLimit());

        act(() => {
            result.current.startCooldown(5);
        });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });

        expect(result.current.rateLimitRemainingSec).toBe(4);

        act(() => {
            result.current.startCooldown(1);
        });

        expect(result.current.rateLimitRemainingSec).toBe(4);
    });
});

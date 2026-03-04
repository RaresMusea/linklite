import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMinDurationSpinner } from '@/hooks/ui/useMinDurationSpinner';

describe('useMinDurationSpinner hook tests', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('Returns spinner hidden by default', () => {
        const { result } = renderHook(() => useMinDurationSpinner());

        expect(result.current.spinnerVisible).toBe(false);
    });

    it('Shows spinner immediately when showSpinner is called', () => {
        const { result } = renderHook(() => useMinDurationSpinner());

        act(() => {
            result.current.showSpinner();
        });

        expect(result.current.spinnerVisible).toBe(true);
    });

    it('Keeps spinner visible until minimum duration passes', () => {
        const { result } = renderHook(() => useMinDurationSpinner(230));

        act(() => {
            result.current.showSpinner();
        });
        expect(result.current.spinnerVisible).toBe(true);

        act(() => {
            vi.advanceTimersByTime(100);
            result.current.hideSpinner();
        });

        expect(result.current.spinnerVisible).toBe(true);

        act(() => {
            vi.advanceTimersByTime(129);
        });
        expect(result.current.spinnerVisible).toBe(true);

        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(result.current.spinnerVisible).toBe(false);
    });

    it('Hides spinner immediately when minimum duration already elapsed', () => {
        const { result } = renderHook(() => useMinDurationSpinner(230));

        act(() => {
            result.current.showSpinner();
            vi.advanceTimersByTime(300);
            result.current.hideSpinner();
        });

        expect(result.current.spinnerVisible).toBe(true);

        act(() => {
            vi.advanceTimersByTime(0);
        });

        expect(result.current.spinnerVisible).toBe(false);
    });

    it('Cleans up pending timeout on unmount', () => {
        const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
        const { result, unmount } = renderHook(() => useMinDurationSpinner(230));

        act(() => {
            result.current.showSpinner();
            result.current.hideSpinner();
        });

        unmount();

        expect(clearTimeoutSpy).toHaveBeenCalled();
    });
});

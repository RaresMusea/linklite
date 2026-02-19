import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRedirectPhase } from '@/components/specific/redirect-interstitial/hooks/useRedirectPhase';

describe('useRedirectPhase', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('advances intro phases from skeleton to card to progress', async () => {
        vi.stubGlobal('requestAnimationFrame', () => 1);
        vi.stubGlobal('cancelAnimationFrame', () => undefined);

        const { result } = renderHook(() => useRedirectPhase(0, '', false));

        expect(result.current.phase).toBe('skeleton');

        await act(async () => {
            await vi.advanceTimersByTimeAsync(150);
        });
        expect(result.current.phase).toBe('card');

        await act(async () => {
            await vi.advanceTimersByTimeAsync(450);
        });
        expect(result.current.phase).toBe('progress');
    });

    it('reaches ready with progress locked at 100 and countdown at 0 when auto-delay is enabled', async () => {
        vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
            cb(10_000);
            return 1;
        });
        vi.stubGlobal('cancelAnimationFrame', () => undefined);

        const { result } = renderHook(() => useRedirectPhase(100, 'https://example.com', true));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });

        expect(result.current.phase).toBe('ready');
        expect(result.current.progress).toBe(100);
        expect(result.current.secondsLeft).toBe(0);
    });

    it('keeps secondsLeft null when auto-delay is disabled', async () => {
        vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
            cb(10_000);
            return 1;
        });
        vi.stubGlobal('cancelAnimationFrame', () => undefined);

        const { result } = renderHook(() => useRedirectPhase(0, 'https://example.com', true));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(3000);
        });

        expect(result.current.phase).toBe('ready');
        expect(result.current.progress).toBe(100);
        expect(result.current.secondsLeft).toBeNull();
    });

    it('auto-redirects when ready and auto-redirect is enabled', async () => {
        vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
            cb(10_000);
            return 1;
        });
        vi.stubGlobal('cancelAnimationFrame', () => undefined);

        const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

        renderHook(() => useRedirectPhase(100, 'https://example.com/path', true));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });

        const zeroDelayCalls = setTimeoutSpy.mock.calls.filter(([, delay]) => delay === 0);
        expect(zeroDelayCalls.length).toBeGreaterThan(0);
    });

    it('does not auto-redirect when auto-redirect is disabled', async () => {
        vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
            cb(10_000);
            return 1;
        });
        vi.stubGlobal('cancelAnimationFrame', () => undefined);

        const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

        renderHook(() => useRedirectPhase(100, 'https://example.com/path', false));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });

        const zeroDelayCalls = setTimeoutSpy.mock.calls.filter(([, delay]) => delay === 0);
        expect(zeroDelayCalls.length).toBe(0);
    });
});

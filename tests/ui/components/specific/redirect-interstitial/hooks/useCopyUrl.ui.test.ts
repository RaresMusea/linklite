import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCopyUrl } from '@/components/specific/redirect-interstitial/hooks/useCopyUrl';

describe('useCopyUrl hook tests', () => {
    beforeEach(() => {
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
                writeText: vi.fn(),
            },
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('Copies the URL and resets copied after 2 seconds', async () => {
        vi.useFakeTimers();
        const writeTextMock = vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined);
        const { result } = renderHook(() => useCopyUrl('https://example.com'));

        await act(async () => {
            await result.current.handleCopyUrl();
        });

        expect(writeTextMock).toHaveBeenCalledWith('https://example.com');
        expect(result.current.copied).toBe(true);

        act(() => {
            vi.advanceTimersByTime(1999);
        });
        expect(result.current.copied).toBe(true);

        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(result.current.copied).toBe(false);
    });

    it('Does nothing when targetUrl is empty', async () => {
        const writeTextMock = vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined);
        const { result } = renderHook(() => useCopyUrl(''));

        await act(async () => {
            await result.current.handleCopyUrl();
        });

        expect(writeTextMock).not.toHaveBeenCalled();
        expect(result.current.copied).toBe(false);
    });

    it('Clears previous timeout when copy is triggered repeatedly', async () => {
        vi.useFakeTimers();
        vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined);
        const { result } = renderHook(() => useCopyUrl('https://example.com/repeat'));

        await act(async () => {
            await result.current.handleCopyUrl();
        });

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        await act(async () => {
            await result.current.handleCopyUrl();
        });

        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(result.current.copied).toBe(true);

        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(result.current.copied).toBe(false);
    });

    it('Sets copied to false when clipboard write fails', async () => {
        const writeTextMock = vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('denied'));
        const { result } = renderHook(() => useCopyUrl('https://example.com/fail'));

        await act(async () => {
            await result.current.handleCopyUrl();
        });

        expect(writeTextMock).toHaveBeenCalledWith('https://example.com/fail');
        expect(result.current.copied).toBe(false);
    });

    it('Cleans up a pending timeout on unmount', async () => {
        vi.useFakeTimers();
        vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined);
        const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
        const { result, unmount } = renderHook(() => useCopyUrl('https://example.com/cleanup'));

        await act(async () => {
            await result.current.handleCopyUrl();
        });

        unmount();
        expect(clearTimeoutSpy).toHaveBeenCalled();
    });
});

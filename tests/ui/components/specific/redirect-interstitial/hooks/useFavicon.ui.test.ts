import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useFavicon } from '@/components/specific/redirect-interstitial/hooks/useFavicon';

describe('useFavicon hook tests', () => {
    it('Returns empty favicon URL and not-ok state when domain is missing', () => {
        const { result } = renderHook(() => useFavicon(undefined));

        expect(result.current.faviconUrl).toBe('');
        expect(result.current.faviconOk).toBe(false);
    });

    it('Builds favicon URL and starts in ok state', () => {
        const { result } = renderHook(() => useFavicon('example.com'));

        expect(result.current.faviconUrl).toBe('https://www.google.com/s2/favicons?domain=example.com&sz=64');
        expect(result.current.faviconOk).toBe(true);
    });

    it('Marks current favicon URL as failed when onFaviconError is called', () => {
        const { result } = renderHook(() => useFavicon('example.com'));
        expect(result.current.faviconOk).toBe(true);

        act(() => {
            result.current.onFaviconError();
        });

        expect(result.current.faviconOk).toBe(false);
    });

    it('Resets to ok when domain changes after a failure', () => {
        const { result, rerender } = renderHook(({ domain }) => useFavicon(domain), {
            initialProps: { domain: 'example.com' },
        });

        act(() => {
            result.current.onFaviconError();
        });
        expect(result.current.faviconOk).toBe(false);

        rerender({ domain: 'nextjs.org' });

        expect(result.current.faviconUrl).toBe('https://www.google.com/s2/favicons?domain=nextjs.org&sz=64');
        expect(result.current.faviconOk).toBe(true);
    });

    it('Encodes domain value in generated URL', () => {
        const { result } = renderHook(() => useFavicon('exa mple.com'));

        expect(result.current.faviconUrl).toBe('https://www.google.com/s2/favicons?domain=exa%20mple.com&sz=64');
    });
});

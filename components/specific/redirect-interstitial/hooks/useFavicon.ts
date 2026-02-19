import { useState } from 'react';

function buildFaviconUrl(domain?: string) {
    if (!domain) return '';
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

export function useFavicon(domain?: string) {
    const faviconUrl = buildFaviconUrl(domain);
    const [failedUrl, setFailedUrl] = useState<string | null>(null);

    return {
        faviconUrl,
        faviconOk: Boolean(faviconUrl) && failedUrl !== faviconUrl,
        onFaviconError: () => setFailedUrl(faviconUrl),
    };
}
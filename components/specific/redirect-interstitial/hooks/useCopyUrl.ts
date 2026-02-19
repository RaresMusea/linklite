import { useEffect, useRef, useState } from 'react';

export function useCopyUrl(targetUrl: string) {
    const [copied, setCopied] = useState(false);
    const copiedTimeoutRef = useRef<number | null>(null);

    const handleCopyUrl = async () => {
        if (!targetUrl) return;
        try {
            await navigator.clipboard.writeText(targetUrl);
            setCopied(true);

            if (copiedTimeoutRef.current) window.clearTimeout(copiedTimeoutRef.current);
            copiedTimeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    useEffect(() => {
        return () => {
            if (copiedTimeoutRef.current) window.clearTimeout(copiedTimeoutRef.current);
        };
    }, []);

    return { copied, handleCopyUrl };
}

import { describe, it, expect } from 'vitest';
import { escapeHtml, getBrandLogoUrl } from '@/lib/email/templates/common';

describe('Email template common helpers', () => {
    it('Escapes html-sensitive characters', () => {
        expect(escapeHtml(`A&B <tag> "x" 'y'`)).toBe('A&amp;B &lt;tag&gt; &quot;x&quot; &#39;y&#39;');
    });

    it('Builds logo URL from source URL origin', () => {
        const sourceUrl = 'https://preprod.linklite.dev/path?q=1';
        expect(getBrandLogoUrl(sourceUrl)).toBe('https://preprod.linklite.dev/linklite.svg');
    });

    it('Falls back to NEXT_PUBLIC_APP_URL when source URL is invalid', () => {
        const original = process.env.NEXT_PUBLIC_APP_URL;
        try {
            process.env.NEXT_PUBLIC_APP_URL = 'https://linklite.dev';
            expect(getBrandLogoUrl('not-a-valid-url')).toBe('https://linklite.dev/linklite.svg');
        } finally {
            if (original === undefined) {
                delete process.env.NEXT_PUBLIC_APP_URL;
            } else {
                process.env.NEXT_PUBLIC_APP_URL = original;
            }
        }
    });

    it('Returns empty string when source URL is invalid and fallback is missing', () => {
        const original = process.env.NEXT_PUBLIC_APP_URL;
        try {
            delete process.env.NEXT_PUBLIC_APP_URL;
            expect(getBrandLogoUrl('not-a-valid-url')).toBe('');
        } finally {
            if (original === undefined) {
                delete process.env.NEXT_PUBLIC_APP_URL;
            } else {
                process.env.NEXT_PUBLIC_APP_URL = original;
            }
        }
    });
});

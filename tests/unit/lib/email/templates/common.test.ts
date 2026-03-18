import { describe, it, expect } from 'vitest';
import { escapeHtml, getBrandLogoUrl, getEmailFooterHtml, getEmailFooterText } from '@/lib/email/templates/common';

describe('Email template common helpers', () => {
    it('Escapes html-sensitive characters', () => {
        expect(escapeHtml(`A&B <tag> "x" 'y'`)).toBe('A&amp;B &lt;tag&gt; &quot;x&quot; &#39;y&#39;');
    });

    it('Builds a consistent professional email footer for plain text and html', () => {
        const footerText = getEmailFooterText().join('\n');
        const footerHtml = getEmailFooterHtml();

        expect(footerText).toContain('Need help? Contact support@linklite.dev');
        expect(footerText).toContain('Security issues: security@linklite.dev');
        expect(footerText).toContain('© LinkLite 2026');

        expect(footerHtml).toContain('mailto:support@linklite.dev');
        expect(footerHtml).toContain('mailto:security@linklite.dev');
        expect(footerHtml).toContain('&copy; LinkLite 2026');
        expect(footerHtml).toContain('text-align:right');
        expect(footerHtml).toContain('<hr');
    });

    it('Builds logo URL from source URL origin', () => {
        const sourceUrl = 'https://preprod.linklite.dev/path?q=1';
        expect(getBrandLogoUrl(sourceUrl)).toBe('https://preprod.linklite.dev/apple-touch-icon.png');
    });

    it('Falls back to NEXT_PUBLIC_APP_URL when source URL is invalid', () => {
        const original = process.env.NEXT_PUBLIC_APP_URL;
        try {
            process.env.NEXT_PUBLIC_APP_URL = 'https://linklite.dev';
            expect(getBrandLogoUrl('not-a-valid-url')).toBe('https://linklite.dev/apple-touch-icon.png');
        } finally {
            if (original === undefined) {
                delete process.env.NEXT_PUBLIC_APP_URL;
            } else {
                process.env.NEXT_PUBLIC_APP_URL = original;
            }
        }
    });

    it('Falls back to preprod asset URL when no valid public fallback exists', () => {
        const original = process.env.NEXT_PUBLIC_APP_URL;
        const originalAssets = process.env.EMAIL_ASSETS_BASE_URL;
        try {
            delete process.env.NEXT_PUBLIC_APP_URL;
            delete process.env.EMAIL_ASSETS_BASE_URL;
            expect(getBrandLogoUrl('not-a-valid-url')).toBe('https://preprod.linklite.dev/apple-touch-icon.png');
        } finally {
            if (original === undefined) {
                delete process.env.NEXT_PUBLIC_APP_URL;
            } else {
                process.env.NEXT_PUBLIC_APP_URL = original;
            }
            if (originalAssets === undefined) {
                delete process.env.EMAIL_ASSETS_BASE_URL;
            } else {
                process.env.EMAIL_ASSETS_BASE_URL = originalAssets;
            }
        }
    });

    it('Uses EMAIL_ASSETS_BASE_URL over other sources when present', () => {
        const originalAssets = process.env.EMAIL_ASSETS_BASE_URL;
        try {
            process.env.EMAIL_ASSETS_BASE_URL = 'https://assets.linklite.dev';
            expect(getBrandLogoUrl('http://localhost:3001/verify-email')).toBe('https://assets.linklite.dev/linklite.png');
        } finally {
            if (originalAssets === undefined) {
                delete process.env.EMAIL_ASSETS_BASE_URL;
            } else {
                process.env.EMAIL_ASSETS_BASE_URL = originalAssets;
            }
        }
    });
});

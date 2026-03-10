import { describe, it, expect } from 'vitest';
import { resetPasswordTemplate } from '@/lib/email/templates/reset_password';

describe('Password reset template tests', () => {
    it('Returns branded subject and plain-text body', () => {
        const resetUrl = 'https://app.linklite.dev/reset-password/token-123';
        const template = resetPasswordTemplate({ name: 'Rares', resetUrl });

        expect(template.subject).toBe('Reset your LinkLite password');
        expect(template.text).toContain('LinkLite');
        expect(template.text).toContain('Hi Rares,');
        expect(template.text).toContain(resetUrl);
    });

    it('Uses reset URL origin for the brand logo in html', () => {
        const resetUrl = 'https://preprod.linklite.dev/reset-password/token-123?x=1';
        const template = resetPasswordTemplate({ resetUrl });

        expect(template.html).toContain('src="https://preprod.linklite.dev/linklite.svg"');
        expect(template.html).toContain('<span style="color:#111111;">Link</span><span style="color:#ff7a00;">Lite</span>');
        expect(template.html).toContain('background:oklch(0.646 0.222 41.116)');
    });

    it('Escapes user-provided values in html output', () => {
        const template = resetPasswordTemplate({
            name: '<b>"Rares"</b>',
            resetUrl: 'https://app.linklite.dev/reset?next=<script>alert(1)</script>&a="x"',
        });

        expect(template.html).toContain('Hi &lt;b&gt;&quot;Rares&quot;&lt;/b&gt;,');
        expect(template.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(template.html).toContain('&quot;x&quot;');
        expect(template.html).not.toContain('<script>alert(1)</script>');
    });

    it('Falls back to NEXT_PUBLIC_APP_URL for logo when reset URL is invalid', () => {
        const original = process.env.NEXT_PUBLIC_APP_URL;
        try {
            process.env.NEXT_PUBLIC_APP_URL = 'https://linklite.dev';

            const template = resetPasswordTemplate({ resetUrl: 'not-a-valid-url' });

            expect(template.html).toContain('src="https://linklite.dev/linklite.svg"');
        } finally {
            if (original === undefined) {
                delete process.env.NEXT_PUBLIC_APP_URL;
            } else {
                process.env.NEXT_PUBLIC_APP_URL = original;
            }
        }
    });
});

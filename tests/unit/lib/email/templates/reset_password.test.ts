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
        expect(template.text).toContain('Need help? Contact support@linklite.dev');
        expect(template.text).toContain('Security issues: security@linklite.dev');
    });

    it('Uses reset URL origin for the brand logo in html', () => {
        const resetUrl = 'https://preprod.linklite.dev/reset-password/token-123?x=1';
        const template = resetPasswordTemplate({ resetUrl });

        expect(template.html).toContain('src="https://preprod.linklite.dev/apple-touch-icon.png"');
        expect(template.html).toContain('<span style="color:#111111;">Link</span><span style="color:#ff7a00;">Lite</span>');
        expect(template.html).toContain('bgcolor="#f97316"');
        expect(template.html).toContain('<table role="presentation"');
        expect(template.html).toContain('mailto:support@linklite.dev');
        expect(template.html).toContain('mailto:security@linklite.dev');
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

            expect(template.html).toContain('src="https://linklite.dev/apple-touch-icon.png"');
        } finally {
            if (original === undefined) {
                delete process.env.NEXT_PUBLIC_APP_URL;
            } else {
                process.env.NEXT_PUBLIC_APP_URL = original;
            }
        }
    });
});

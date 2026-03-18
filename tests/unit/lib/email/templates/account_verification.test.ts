import { describe, it, expect } from 'vitest';
import { accountVerificationTemplate } from '@/lib/email/templates/account_verification';

describe('Account verification template tests', () => {
    it('Returns branded subject and plain-text body', () => {
        const verificationUrl = 'https://app.linklite.dev/verify-email/token-123';
        const template = accountVerificationTemplate({ name: 'Rares', verificationUrl });

        expect(template.subject).toBe('Verify your LinkLite account');
        expect(template.text).toContain('LinkLite');
        expect(template.text).toContain('Hi Rares,');
        expect(template.text).toContain('Click the verification button below to verify your account:');
        expect(template.text).toContain(verificationUrl);
        expect(template.text).toContain('Need help? Contact support@linklite.dev');
        expect(template.text).toContain('Security issues: security@linklite.dev');
    });

    it('Uses verification URL origin for the brand logo in html', () => {
        const verificationUrl = 'https://preprod.linklite.dev/verify-email/token-123?x=1';
        const template = accountVerificationTemplate({ verificationUrl });

        expect(template.html).toContain('src="https://preprod.linklite.dev/apple-touch-icon.png"');
        expect(template.html).toContain('<span style="color:#111111;">Link</span><span style="color:#ff7a00;">Lite</span>');
        expect(template.html).toContain('bgcolor="#f97316"');
        expect(template.html).toContain('<table role="presentation"');
        expect(template.html).toContain('Click the button below to verify your account and finish setting things up.');
        expect(template.html).toContain('mailto:support@linklite.dev');
        expect(template.html).toContain('mailto:security@linklite.dev');
    });

    it('Escapes user-provided values in html output', () => {
        const template = accountVerificationTemplate({
            name: '<b>"Rares"</b>',
            verificationUrl: 'https://app.linklite.dev/verify?next=<script>alert(1)</script>&a="x"',
        });

        expect(template.html).toContain('Hi &lt;b&gt;&quot;Rares&quot;&lt;/b&gt;,');
        expect(template.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(template.html).toContain('&quot;x&quot;');
        expect(template.html).not.toContain('<script>alert(1)</script>');
    });

    it('Falls back to NEXT_PUBLIC_APP_URL for logo when verification URL is invalid', () => {
        const original = process.env.NEXT_PUBLIC_APP_URL;
        try {
            process.env.NEXT_PUBLIC_APP_URL = 'https://linklite.dev';

            const template = accountVerificationTemplate({ verificationUrl: 'not-a-valid-url' });

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

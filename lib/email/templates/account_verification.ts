import { escapeHtml, getBrandLogoUrl } from '@/lib/email/templates/common';

type AccountVerificationTemplateParams = {
    name?: string | null;
    verificationUrl: string;
};

export function accountVerificationTemplate({ name, verificationUrl }: AccountVerificationTemplateParams) {
    const primaryColor = '#f97316';
    const greeting = name ? `Hi ${name},` : 'Hello!';
    const safeGreeting = escapeHtml(greeting);
    const safeVerificationUrl = escapeHtml(verificationUrl);
    const logoUrl = escapeHtml(getBrandLogoUrl(verificationUrl));

    return {
        subject: 'Verify your LinkLite account',
        text: [
            'LinkLite',
            '',
            greeting,
            '',
            'Thanks for creating your LinkLite account.',
            'Click the verification button below to verify your account:',
            verificationUrl,
            '',
            'If you did not create this account, you can safely ignore this email.',
        ].join('\n'),
        html: `
      <div style="background:#f6f6f8;padding:24px 12px;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ececf1;border-radius:12px;padding:28px;font-family:Arial,sans-serif;line-height:1.6;color:#111111;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
            <img
              src="${logoUrl}"
              alt="LinkLite"
              width="36"
              height="36"
              style="display:block;width:36px;height:36px;border-radius:10px;"
            />
            <span style="font-size:34px;font-weight:800;line-height:1;">
              <span style="color:#111111;">Link</span><span style="color:#ff7a00;">Lite</span>
            </span>
          </div>

          <h2 style="margin:0 0 10px 0;font-size:24px;line-height:1.2;color:#111111;">Verify your email address</h2>
          <p style="margin:0 0 10px 0;">${safeGreeting}</p>
          <p style="margin:0 0 16px 0;">Thanks for creating your LinkLite account.</p>
          <p style="margin:0 0 16px 0;">Click the button below to verify your account and finish setting things up.</p>

          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px 0;">
            <tr>
              <td bgcolor="${primaryColor}" style="border-radius:10px;">
                <a
                  href="${safeVerificationUrl}"
                  style="display:inline-block;padding:12px 18px;border-radius:10px;text-decoration:none;color:#ffffff;font-weight:700;"
                >
                  Verify email
                </a>
              </td>
            </tr>
          </table>
          <p style="margin:0;color:#4b5563;">If you did not create this account, you can safely ignore this email.</p>
        </div>
      </div>
    `,
    };
}

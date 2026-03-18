import { escapeHtml, getBrandLogoUrl, getEmailFooterHtml, getEmailFooterText } from '@/lib/email/templates/common';

type ResetPasswordTemplateParams = {
    name?: string | null;
    resetUrl: string;
};

export function resetPasswordTemplate({ name, resetUrl }: ResetPasswordTemplateParams) {
    const primaryColor = '#f97316';
    const greeting = name ? `Hi ${name},` : 'Hello!';
    const safeGreeting = escapeHtml(greeting);
    const safeResetUrl = escapeHtml(resetUrl);
    const logoUrl = escapeHtml(getBrandLogoUrl(resetUrl));
    const footerHtml = getEmailFooterHtml();
    const footerText = getEmailFooterText();

    return {
        subject: 'Reset your LinkLite password',
        text: [
            'LinkLite',
            '',
            greeting,
            '',
            'We received a request to reset your password.',
            'Use the link below to set a new password:',
            resetUrl,
            '',
            'If you did not request this, you can safely ignore this email.',
            ...footerText,
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

          <h2 style="margin:0 0 10px 0;font-size:24px;line-height:1.2;color:#111111;">Reset your password</h2>
          <p style="margin:0 0 10px 0;">${safeGreeting}</p>
          <p style="margin:0 0 16px 0;">We received a request to reset your password.</p>

          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px 0;">
            <tr>
              <td bgcolor="${primaryColor}" style="border-radius:10px;">
                <a
                  href="${safeResetUrl}"
                  style="display:inline-block;padding:12px 18px;border-radius:10px;text-decoration:none;color:#ffffff;font-weight:700;"
                >
                  Reset password
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:0;color:#4b5563;">If you did not request this, you can safely ignore this email.</p>
          ${footerHtml}
        </div>
      </div>
    `,
    };
}
